const { test, expect } = require('@playwright/test');

const demoUrl = 'http://127.0.0.1:4173/index.html';

test('vanilla demo loads without a framework runtime', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4173/')) {
      externalRequests.push(request.url());
    }
  });

  await page.goto(demoUrl);
  await expect(page.locator('body')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('.version')).toHaveText('0.3.0-rc.0');
  await expect(page.locator('#nprogress')).toHaveCount(1);
  await expect(page.locator('#nprogress')).toHaveCount(0);

  await page.evaluate(() => {
    window.NProgress.cancel();
    window.NProgress.configure({ speed: 0, trickle: false });
  });
  await page.locator('#b-40').click();
  await expect(page.locator('#nprogress .bar')).toHaveAttribute('aria-valuenow', '40');
  expect(externalRequests).toEqual([]);
});
