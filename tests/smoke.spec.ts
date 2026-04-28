import { test, expect } from "@playwright/test";

// Smoke tests run against a real Vite production build served by `vite preview`.
// The aim is to catch the broad class of "site is broken after a dependency
// bump" regressions that a `tsc -b && vite build` step alone would miss --
// rendering, click handlers, modal mounting, theme switching.

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

  await page.getByRole("button", { name: /^View details for / }).first().click();

  // DetailView renders <div role="dialog">
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

  // Esc should dismiss
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("dark mode toggle flips the html class and persists", async ({ page }) => {
  await page.goto("./");

  const html = page.locator("html");

  // Default theme is light, so the toggle reads "Switch to dark mode"
  await page.getByRole("button", { name: /switch to dark mode/i }).click();
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
  await mushroomChip.click();
  await expect(mushroomChip).toHaveAttribute("aria-pressed", "true");
  await expect(allChip).toHaveAttribute("aria-pressed", "false");

  // Click Mushrooms again -> back to All
  await mushroomChip.click();
  await expect(mushroomChip).toHaveAttribute("aria-pressed", "false");
  await expect(allChip).toHaveAttribute("aria-pressed", "true");
});

test("snapshot tier loads the bundled Wikidata dataset", async ({ page }) => {
  await page.goto("./");

  // Click the Snapshot tier of the source toggle
  await page.getByRole("button", { name: "Snapshot" }).click();

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
