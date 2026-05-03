// Deeper audit of mobile responsiveness scenarios I haven't covered:
// landscape, modal close button, tap target measurements, horizontal scroll.
import { chromium } from 'playwright';

const browser = await chromium.launch();

// 1. iPhone SE landscape (667x375). Modal especially is interesting because
//    its image area is h-72 (288px) which is most of a 375-tall viewport.
{
  const ctx = await browser.newContext({
    viewport: { width: 667, height: 375 },
    colorScheme: 'dark',
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'screenshots/landscape-home.png',
    clip: { x: 0, y: 0, width: 667, height: 375 },
  });
  await page.locator('article').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'screenshots/landscape-modal.png',
    clip: { x: 0, y: 0, width: 667, height: 375 },
  });
  await ctx.close();
  console.log('captured landscape 667x375');
}

// 2. Modal close button + tap targets at iPhone SE 375. We measure the
//    bounding rects of every interactive element to flag those below 44x44.
{
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

  // Snapshot the home page interactive elements.
  const homeMeasurements = await page.$$eval(
    'button, a, input, select, [role="button"]',
    (els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          label:
            (el.getAttribute('aria-label') ||
              el.getAttribute('title') ||
              el.textContent ||
              '')
              .trim()
              .slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          path: el.outerHTML.slice(0, 80),
        };
      })
  );
  console.log('\nHome page interactive elements at 375x667:');
  for (const m of homeMeasurements) {
    const tooSmall = m.w < 44 || m.h < 44;
    if (tooSmall) {
      console.log(`  [SMALL ${m.w}x${m.h}] ${m.tag} "${m.label}"`);
    }
  }

  // Now open the modal and measure.
  await page.locator('article').first().click();
  await page.waitForTimeout(500);
  const modalMeasurements = await page.$$eval(
    '[role="dialog"] button, [role="dialog"] a',
    (els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          label:
            (el.getAttribute('aria-label') ||
              el.getAttribute('title') ||
              el.textContent ||
              '')
              .trim()
              .slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
  );
  console.log('\nModal interactive elements at 375x667:');
  for (const m of modalMeasurements) {
    const tooSmall = m.w < 44 || m.h < 44;
    if (tooSmall) {
      console.log(`  [SMALL ${m.w}x${m.h}] ${m.tag} "${m.label}"`);
    }
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Horizontal scroll check at 375.
  const docMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log(
    `\nHorizontal scroll at 375: scrollWidth=${docMetrics.scrollWidth} clientWidth=${docMetrics.clientWidth} ${
      docMetrics.scrollWidth > docMetrics.clientWidth ? 'OVERFLOW' : 'OK'
    }`
  );
  await ctx.close();
}

await browser.close();
console.log('\ndeep audit done');
