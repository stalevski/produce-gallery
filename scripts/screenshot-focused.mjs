// Focused mobile audit screenshots. Captures specific UI sections at the
// smallest realistic viewport (iPhone SE 375x667) so we can see exactly
// what overflows / wraps badly.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  colorScheme: 'dark',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto('http://localhost:5173/');
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(300);

// 1. Header (brand row + theme/source toggle + title + description)
await page.locator('header').screenshot({ path: 'screenshots/focus-header-375.png' });

// 2. Filter bar
await page.locator('div.bg-surface\\/60').first().screenshot({ path: 'screenshots/focus-filterbar-375.png' });

// 3. Pagination top
await page.locator('div.bg-surface\\/60').nth(1).screenshot({ path: 'screenshots/focus-pagination-375.png' });

// 4. First card
await page.locator('article').first().screenshot({ path: 'screenshots/focus-card-375.png' });

// 5. Whole top of page (above-the-fold-ish, 1500px tall)
await page.screenshot({
  path: 'screenshots/focus-top-375.png',
  clip: { x: 0, y: 0, width: 375, height: 1500 },
});

// 6. Modal opened
await page.locator('article').first().click();
await page.waitForTimeout(500);
await page.screenshot({
  path: 'screenshots/focus-modal-375.png',
  clip: { x: 0, y: 0, width: 375, height: 800 },
});

// 7. Modal scrolled to middle for the data section
await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  if (dialog) dialog.scrollTop = 400;
});
await page.waitForTimeout(200);
await page.screenshot({
  path: 'screenshots/focus-modal-mid-375.png',
  clip: { x: 0, y: 0, width: 375, height: 800 },
});

await ctx.close();
await browser.close();
console.log('focused captures done');
