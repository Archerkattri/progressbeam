const { test, expect } = require('@playwright/test');

const fixtureUrl = 'http://127.0.0.1:4173/test/esm-fixture.html';

test('native browser ESM entry exposes NProgress', async ({ page }) => {
  await page.goto(fixtureUrl);
  await page.waitForFunction(() => typeof window.NProgress === 'object');
  await page.evaluate(() => window.NProgress.configure({ speed: 0, trickle: false }));
  await page.evaluate(() => window.NProgress.start());
  await expect(page.locator('#nprogress .bar')).toHaveAttribute('role', 'progressbar');
});
