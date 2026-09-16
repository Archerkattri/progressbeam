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

test('uses transform-based positioning in modern browsers (#222)', async ({ page }) => {
  const positioning = await page.evaluate(() => window.ProgressBeam.getPositioningCSS());
  expect(positioning).toBe('translate3d');

  await page.evaluate(() => window.ProgressBeam.set(0.5));
  const style = await page.evaluate(
    () => document.querySelector('#progressbeam .bar').getAttribute('style')
  );
  expect(style).toContain('transform');
  expect(style).not.toContain('all ');
});

test('keeps the wrapper out of flex layout in custom parents (#223)', async ({ page }) => {
  await page.evaluate(() => {
    const parent = document.createElement('div');
    parent.id = 'flex-parent';
    parent.style.display = 'flex';
    const sibling = document.createElement('div');
    sibling.id = 'sibling';
    sibling.textContent = 'content';
    parent.appendChild(sibling);
    document.body.appendChild(parent);
    window.ProgressBeam.configure({ parent: '#flex-parent' });
    window.ProgressBeam.set(0.5);
  });

  const wrapperPosition = await page.evaluate(
    () => getComputedStyle(document.querySelector('#progressbeam')).position
  );
  expect(wrapperPosition).toBe('absolute');

  const barBox = await page.locator('#progressbeam .bar').boundingBox();
  expect(barBox.width).toBeGreaterThan(0);
});

test('stacks the bar above content with a configurable z-index (#175)', async ({ page }) => {
  await page.evaluate(() => {
    const parent = document.createElement('div');
    parent.id = 'custom';
    document.body.appendChild(parent);
    window.ProgressBeam.configure({ parent: '#custom', zIndex: 2000 });
    window.ProgressBeam.set(0.5);
  });

  await expect(page.locator('#progressbeam .bar')).toHaveCSS('position', 'absolute');
  await expect(page.locator('#progressbeam .bar')).toHaveCSS('z-index', '2000');
});

test('fades out before removing the completed indicator (#175)', async ({ page }) => {
  await page.evaluate(() => {
    window.ProgressBeam.configure({ speed: 60 });
    window.ProgressBeam.set(1);
  });
  await expect(page.locator('#progressbeam')).toHaveCount(0);
});

test('renders full-width on a mobile viewport (#194)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => window.ProgressBeam.set(0.5));

  const barBox = await page.locator('#progressbeam .bar').boundingBox();
  expect(Math.abs(barBox.width - 375)).toBeLessThan(2);
});

test('pins the bar and spinner to the base in bottom mode', async ({ page }) => {
  await page.evaluate(() => {
    window.ProgressBeam.configure({ position: 'bottom' });
    window.ProgressBeam.set(0.5);
  });

  await expect(page.locator('#progressbeam.progressbeam-bottom .bar')).toHaveCSS('bottom', '0px');

  const barBox = await page.locator('#progressbeam.progressbeam-bottom .bar').boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs((barBox.y + barBox.height) - viewport.height)).toBeLessThan(2);
});

test('preserves spinner animation under a custom parent (#38)', async ({ page }) => {
  await page.evaluate(() => {
    const parent = document.createElement('div');
    parent.id = 'custom';
    document.body.appendChild(parent);
    window.ProgressBeam.configure({ parent: '#custom' });
    window.ProgressBeam.start();
  });
  await expect(page.locator('#progressbeam .spinner')).toHaveCSS('position', 'absolute');

  await page.evaluate(() => window.ProgressBeam.cancel());
  await expect(page.locator('#progressbeam')).toHaveCount(0);
  const status = await page.evaluate(() => window.ProgressBeam.status);
  expect(status).toBeNull();
});
