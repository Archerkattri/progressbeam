const path = require('node:path');
const { test, expect } = require('@playwright/test');

const scriptPath = path.resolve(__dirname, '..', 'progressbeam.js');
const stylePath = path.resolve(__dirname, '..', 'progressbeam.css');

test.beforeEach(async ({ page }) => {
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addStyleTag({ path: stylePath });
  await page.addScriptTag({ path: scriptPath });
  await page.evaluate(() => {
    window.ProgressBeam.configure({ speed: 0, trickle: false });
  });
});

test('renders accessible progress semantics in a real browser', async ({ page }) => {
  await page.evaluate(() => window.ProgressBeam.set(0.42));

  const bar = page.locator('#progressbeam .bar');
  await expect(bar).toHaveAttribute('role', 'progressbar');
  await expect(bar).toHaveAttribute('aria-label', 'Loading');
  await expect(bar).toHaveAttribute('aria-valuenow', '42');
  await expect(page.locator('#progressbeam .spinner')).toHaveAttribute('aria-hidden', 'true');
});

test('supports live presentation configuration', async ({ page }) => {
  await page.evaluate(() => {
    window.ProgressBeam.configure({
      barColor: '#123456',
      spinnerColor: '#abcdef',
      failureColor: '#dc2626',
      height: '4px',
      zIndex: 2000,
      indeterminate: true,
      rtl: true
    });
    window.ProgressBeam.set(0.5);
  });

  await expect(page.locator('#progressbeam')).toHaveClass(/progressbeam-rtl/);
  await expect(page.locator('#progressbeam')).toHaveClass(/progressbeam-indeterminate/);
  await expect(page.locator('#progressbeam .bar')).toHaveCSS('--progressbeam-bar-color', '#123456');
  await expect(page.locator('#progressbeam .spinner')).toHaveCSS('--progressbeam-spinner-color', '#abcdef');
  await expect(page.locator('#progressbeam')).toHaveCSS('--progressbeam-height', '4px');
  await expect(page.locator('#progressbeam')).toHaveCSS('--progressbeam-z-index', '2000');
});

test('can independently hide the bar and spinner', async ({ page }) => {
  await page.evaluate(() => {
    window.ProgressBeam.configure({ showBar: false });
    window.ProgressBeam.set(0.5);
  });
  await expect(page.locator('#progressbeam .bar')).toHaveCount(0);
  await expect(page.locator('#progressbeam .spinner')).toHaveCount(1);

  await page.evaluate(() => {
    window.ProgressBeam.configure({ showBar: true, showSpinner: false });
  });
  await expect(page.locator('#progressbeam .bar')).toHaveCount(1);
  await expect(page.locator('#progressbeam .spinner')).toHaveCount(0);
});

test('removes itself after completion', async ({ page }) => {
  await page.evaluate(() => window.ProgressBeam.set(1));
  await expect(page.locator('#progressbeam')).toHaveCount(0);
});

test('renders and clears failure state and cancellation', async ({ page }) => {
  await page.evaluate(() => {
    window.ProgressBeam.configure({ failureColor: '#dc2626' });
    window.ProgressBeam.start().fail();
  });

  await expect(page.locator('#progressbeam')).toHaveClass(/progressbeam-failed/);
  await expect(page.locator('#progressbeam .bar')).toHaveCSS('background-color', 'rgb(220, 38, 38)');

  await page.evaluate(() => window.ProgressBeam.cancel());
  await expect(page.locator('#progressbeam')).toHaveCount(0);
});

test('respects reduced-motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.ProgressBeam.set(0.5));

  await expect(page.locator('#progressbeam .spinner-icon')).toHaveCSS('animation-name', 'none');
});
