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
