const { test, expect } = require('@playwright/test');

const fixtureUrl = 'http://127.0.0.1:4173/test/esm-fixture.html';

test('native browser ESM entry exposes ProgressBeam', async ({ page }) => {
  await page.goto(fixtureUrl);
  await page.waitForFunction(() => typeof window.ProgressBeam === 'object');
  await page.evaluate(() => window.ProgressBeam.configure({ speed: 0, trickle: false }));
  await page.evaluate(() => window.ProgressBeam.start());
  await expect(page.locator('#progressbeam .bar')).toHaveAttribute('role', 'progressbar');
});
