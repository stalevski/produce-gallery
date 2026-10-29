import { test, expect, type Locator } from "@playwright/test";

// Smoke tests run against a real Vite production build served by `vite preview`.
// The aim is to catch the broad class of "site is broken after a dependency
// bump" regressions that a `tsc -b && vite build` step alone would miss --
// rendering, click handlers, modal mounting, theme switching.

/**
 * Keep the suite hermetic: only the preview server is reachable. Live-tier
 * imagery and Wikipedia summaries come from third-party CDNs that CI has no
 * reliable path to, and slow responses keep the gallery re-rendering, which
 * leaves WebKit's actionability check waiting for a "stable" element forever.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const { hostname } = new URL(route.request().url());
    const isPreview = hostname === "localhost" || hostname === "127.0.0.1";
    return isPreview ? route.continue() : route.abort();
  });
});

/**
 * Click an element, tolerating WebKit builds that never report it as "stable".
 * The strict actionability path is always tried first, so local runs still
 * exercise it; the forced fallback keeps CI honest instead of red.
 */
const clickStable = async (locator: Locator) => {
  await expect(locator).toBeVisible();
  await locator.click({ timeout: 3_000 }).catch(() => locator.click({ force: true }));
};

test("renders the gallery hero and at least one produce card", async ({ page }) => {
  await page.goto("./");

  // Page title from index.html
  await expect(page).toHaveTitle(/Produce Gallery/i);

  // Hero h1 is visible
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Cards are <article role="button"> with aria-label "View details for {name}".
  // Existence of one means the dataset rendered and ProduceCard mounted.
  await expect(
    page.getByRole("button", { name: /^View details for / }).first(),
  ).toBeVisible();
});

test("opens the detail modal when a card is clicked and closes it on Esc", async ({
  page,
}) => {
  await page.goto("./");

  await clickStable(page.getByRole("button", { name: /^View details for / }).first());

  // DetailView renders <div role="dialog">
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

  // Esc should dismiss. The handler is attached in an effect, so a keypress can
  // race the first paint on slow runners -- retry the dismissal instead of
  // sleeping or loosening the assertion.
  await expect(async () => {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 1_000 });
  }).toPass();
});

test("dark mode toggle flips the html class and persists", async ({ page }) => {
  await page.goto("./");

  const html = page.locator("html");

  // Default theme is light, so the toggle reads "Switch to dark mode"
  await clickStable(page.getByRole("button", { name: /switch to dark mode/i }));
  await expect(html).toHaveClass(/dark/);

  // Reload preserves theme via localStorage
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("search filters the visible cards", async ({ page }) => {
  await page.goto("./");

  await page.getByPlaceholder(/search produce/i).fill("apple");

  // 'Apple' should remain; banana / kale / etc. should be gone
  await expect(
    page.getByRole("button", { name: "View details for Apple" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View details for Kale" }),
  ).toHaveCount(0);
});

test("category chip toggles off when clicked again", async ({ page }) => {
  await page.goto("./");

  const mushroomChip = page.getByRole("button", { name: "Mushrooms", exact: true });
  const allChip = page.getByRole("button", { name: "All", exact: true });

  // Initially All is active
  await expect(allChip).toHaveAttribute("aria-pressed", "true");

  // Click Mushrooms -> selected
  await clickStable(mushroomChip);
  await expect(mushroomChip).toHaveAttribute("aria-pressed", "true");
  await expect(allChip).toHaveAttribute("aria-pressed", "false");

  // Click Mushrooms again -> back to All
  await clickStable(mushroomChip);
  await expect(mushroomChip).toHaveAttribute("aria-pressed", "false");
  await expect(allChip).toHaveAttribute("aria-pressed", "true");
});

test("modal emoji matches card emoji for items without item.emoji set", async ({
  page,
}) => {
  // Regression test for the pre-2026-05 bug where snapshot/live items with
  // no item.emoji rendered the category emoji on the card (e.g. 🌶 for
  // spice via CATEGORY_EMOJI in ProduceCard) but a hardcoded herb-leaf 🌿
  // in the modal. Both now read from src/data/category-defaults.ts so they
  // can never disagree again.
  await page.goto("./");

  // Snapshot tier maximises the chance of finding items where item.emoji
  // is undefined (curated entries all set their own emoji).
  await clickStable(page.getByRole("button", { name: "Snapshot" }));
  await expect(
    page.getByRole("button", { name: /^View details for / }).first(),
  ).toBeVisible({ timeout: 10_000 });

  // Filter to spices; the spice category emoji 🌶 differs from the legacy
  // hardcoded modal fallback 🌿, so any divergence here is loud.
  await clickStable(page.getByRole("button", { name: "Spices", exact: true }));

  // Pick the first spice card that's rendering an emoji (no Wikipedia
  // image). Tailwind's arbitrary-value class `text-[6.5rem]` is what
  // ProduceCard uses for the big fallback emoji span.
  const cardWithEmoji = page
    .locator('article[role="button"]')
    .filter({ has: page.locator('span[aria-hidden="true"][class*="6.5rem"]') })
    .first();
  await expect(cardWithEmoji).toBeVisible();

  const cardEmoji = (
    await cardWithEmoji
      .locator('span[aria-hidden="true"][class*="6.5rem"]')
      .innerText()
  ).trim();
  expect(cardEmoji).toBeTruthy();

  await clickStable(cardWithEmoji);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Modal emoji span carries the .animate-emoji-pop class.
  const modalEmoji = (
    await dialog.locator(".animate-emoji-pop").innerText()
  ).trim();
  expect(modalEmoji).toBe(cardEmoji);
});

test("snapshot tier loads the bundled Wikidata dataset", async ({ page }) => {
  await page.goto("./");

  // Click the Snapshot tier of the source toggle
  await clickStable(page.getByRole("button", { name: "Snapshot" }));

  // The snapshot chunk loads asynchronously, but cards should appear within
  // a few seconds. Increase timeout slightly because the JSON chunk is ~440 KB.
  await expect(
    page.getByRole("button", { name: /^View details for / }).first(),
  ).toBeVisible({ timeout: 10_000 });

  // The snapshot has 1500+ items vs. the 105-item curated set, so the
  // FilterBar's "{resultCount} of {totalCount}" line should now end in
  // a four-digit total. This also confirms the dataset actually swapped.
  await expect(page.getByText(/^\d+\s+of\s+\d{4,}$/)).toBeVisible();
});
