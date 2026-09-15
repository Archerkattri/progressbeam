const path = require('node:path');
const { test, expect } = require('@playwright/test');

const scriptPath = path.resolve(__dirname, '..', 'nprogress.js');
const stylePath = path.resolve(__dirname, '..', 'nprogress.css');

test.beforeEach(async ({ page }) => {
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addStyleTag({ path: stylePath });
  await page.addScriptTag({ path: scriptPath });
  await page.evaluate(() => {
    window.NProgress.configure({ speed: 0, trickle: false });
  });
});

test('renders accessible progress semantics in a real browser', async ({ page }) => {
  await page.evaluate(() => window.NProgress.set(0.42));

  const bar = page.locator('#nprogress .bar');
  await expect(bar).toHaveAttribute('role', 'progressbar');
  await expect(bar).toHaveAttribute('aria-label', 'Loading');
  await expect(bar).toHaveAttribute('aria-valuenow', '42');
  await expect(page.locator('#nprogress .spinner')).toHaveAttribute('aria-hidden', 'true');
});

test('supports live presentation configuration', async ({ page }) => {
  await page.evaluate(() => {
    window.NProgress.configure({
      barColor: '#123456',
      spinnerColor: '#abcdef',
      failureColor: '#dc2626',
      height: '4px',
      zIndex: 2000,
      indeterminate: true,
      rtl: true
    });
    window.NProgress.set(0.5);
  });

  await expect(page.locator('#nprogress')).toHaveClass(/nprogress-rtl/);
  await expect(page.locator('#nprogress')).toHaveClass(/nprogress-indeterminate/);
  await expect(page.locator('#nprogress .bar')).toHaveCSS('--nprogress-bar-color', '#123456');
  await expect(page.locator('#nprogress .spinner')).toHaveCSS('--nprogress-spinner-color', '#abcdef');
  await expect(page.locator('#nprogress')).toHaveCSS('--nprogress-height', '4px');
  await expect(page.locator('#nprogress')).toHaveCSS('--nprogress-z-index', '2000');
});

test('can independently hide the bar and spinner', async ({ page }) => {
  await page.evaluate(() => {
    window.NProgress.configure({ showBar: false });
    window.NProgress.set(0.5);
  });
  await expect(page.locator('#nprogress .bar')).toHaveCount(0);
  await expect(page.locator('#nprogress .spinner')).toHaveCount(1);

  await page.evaluate(() => {
    window.NProgress.configure({ showBar: true, showSpinner: false });
  });
  await expect(page.locator('#nprogress .bar')).toHaveCount(1);
  await expect(page.locator('#nprogress .spinner')).toHaveCount(0);
});

test('removes itself after completion', async ({ page }) => {
  await page.evaluate(() => window.NProgress.set(1));
  await expect(page.locator('#nprogress')).toHaveCount(0);
});

test('renders and clears failure state and cancellation', async ({ page }) => {
  await page.evaluate(() => {
    window.NProgress.configure({ failureColor: '#dc2626' });
    window.NProgress.start().fail();
  });

  await expect(page.locator('#nprogress')).toHaveClass(/nprogress-failed/);
  await expect(page.locator('#nprogress .bar')).toHaveCSS('background-color', 'rgb(220, 38, 38)');

  await page.evaluate(() => window.NProgress.cancel());
  await expect(page.locator('#nprogress')).toHaveCount(0);
});

test('respects reduced-motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.NProgress.set(0.5));

  await expect(page.locator('#nprogress .spinner-icon')).toHaveCSS('animation-name', 'none');
});
