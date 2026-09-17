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
  await expect(page.locator('.version').first()).toHaveText('1.0.0');
  await expect(page.locator('#progressbeam')).toHaveCount(1);
  await expect(page.locator('#progressbeam')).toHaveCount(0);

  await page.evaluate(() => {
    window.ProgressBeam.cancel();
    window.ProgressBeam.configure({ speed: 0, trickle: false });
  });
  await page.locator('#b-40').click();
  await expect(page.locator('#progressbeam .bar')).toHaveAttribute('aria-valuenow', '40');
  expect(externalRequests).toEqual([]);
});

test('switches themes with an accessible persistent control', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(demoUrl);

  const toggle = page.locator('#theme-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-label')).toHaveText('dark mode');
});

test('demonstrates a failed request state', async ({ page }) => {
  await page.goto(demoUrl);
  await page.locator('#b-fail').click();

  await expect(page.locator('#progressbeam')).toHaveClass(/progressbeam-failed/);
  await expect(page.locator('#demo-status')).toHaveText('Failed');
  await expect(page.locator('#stage-message')).toHaveText('The request needs another try');
});

test('drives decrement, pause, resume, cancel, and reset controls', async ({ page }) => {
  await page.goto(demoUrl);
  await page.evaluate(() => {
    window.ProgressBeam.cancel();
    window.ProgressBeam.configure({ speed: 0, trickle: false });
  });

  await page.locator('#b-0').click();
  await page.locator('#b-40').click();
  await page.locator('#b-dec').click();
  await expect(page.locator('#progressbeam .bar')).toHaveAttribute('aria-valuenow', '38');

  await page.locator('#b-pause').click();
  await expect(page.locator('#demo-status')).toHaveText('Paused');
  await expect(page.locator('#stage-message')).toHaveText('Trickling is paused');

  await page.locator('#b-resume').click();
  await expect(page.locator('#demo-status')).toHaveText('Loading');

  await page.locator('#b-cancel').click();
  await expect(page.locator('#demo-status')).toHaveText('Ready');

  await page.locator('#b-reset').click();
  await expect(page.locator('#demo-status')).toHaveText('Ready');
  await expect(page.locator('#stage-message')).toHaveText('Waiting for an action');
});
