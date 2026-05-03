// Verify the responsive breakpoints didn't regress at sm+ widths.
import { chromium } from 'playwright';

const sizes = [
  { name: 'sm-just-above', width: 660, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1023, height: 768 },
  { name: 'desktop', width: 1280, height: 800 },
];

const browser = await chromium.launch();
for (const s of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    colorScheme: 'dark',
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await page.locator('header').screenshot({ path: `screenshots/focus-header-${s.width}.png` });
  await page.locator('div.bg-surface\\/60').first().screenshot({
    path: `screenshots/focus-filterbar-${s.width}.png`,
  });
  await ctx.close();
  console.log(`captured ${s.name}`);
}
await browser.close();
