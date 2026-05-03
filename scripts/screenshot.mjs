// One-off screenshot script for the mobile-responsiveness audit. Not meant
// to live forever; safe to delete once the audit is done. Uses the running
// dev server at http://localhost:5173/.
import { chromium } from 'playwright';

const viewports = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'iphone-pro-max', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
];

const themes = ['light', 'dark'];

const browser = await chromium.launch();
for (const v of viewports) {
  for (const theme of themes) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      colorScheme: theme,
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.evaluate((t) => {
      document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `screenshots/${v.name}-${theme}-home.png`,
      fullPage: true,
    });
    await page.locator('article').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `screenshots/${v.name}-${theme}-modal.png`,
      fullPage: false,
    });
    await ctx.close();
    console.log(`captured ${v.name} ${theme}`);
  }
}
await browser.close();
