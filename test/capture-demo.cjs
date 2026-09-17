// Captures the README demo GIFs from the live demo panel.
// Run: node test/capture-demo.cjs (needs playwright chromium).
// Output: docs/output-demo.gif, docs/output-demo-dark.gif
const spawn = require('cross-spawn');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize } = require('gifenc');
const { chromium } = require('@playwright/test');

// Exact nearest-color mapping. gifenc's applyPalette caches by reduced-
// precision bin, so distinct colors in one bin inherit the first pixel's
// mapping — invisible in photos, but it shifts flat UI colors systematically.
// Exact 24-bit cache keys keep the mapping correct and still fast.
function nearestIndex(r, g, b, palette) {
  // Starts at 1: slot 0 is the reserved transparent dummy.
  let best = 1;
  let bestDist = Infinity;
  for (let i = 1; i < palette.length; i += 1) {
    const c = palette[i];
    const dist = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2]);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function mapExact(data, palette, cache) {
  const index = new Uint8Array(data.length >> 2);
  for (let p = 0; p < data.length; p += 4) {
    const key = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
    let idx = cache.get(key);
    if (idx === undefined) {
      idx = nearestIndex(data[p], data[p + 1], data[p + 2], palette);
      cache.set(key, idx);
    }
    index[p >> 2] = idx;
  }
  return index;
}

const root = path.resolve(__dirname, '..');
const port = 4174;
const baseUrl = `http://127.0.0.1:${port}/index.html`;
const fps = 6;
const frameMs = 1000 / fps;
const colors = 64;
// [atMs, buttonId] — ends on Complete, matching the settled first frame.
const schedule = [
  [300, '#b-0'],
  [1300, '#b-40'],
  [2200, '#b-inc'],
  [3100, '#b-dec'],
  [4000, '#b-pause'],
  [5200, '#b-resume'],
  [6400, '#b-fail'],
  [8400, '#b-reset'],
  [9200, '#b-0'],
  [10500, '#b-100']
];
const endMs = 12000;

function waitForServer(tries = 50) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      http.get(`${baseUrl}`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (left <= 0) {
          reject(new Error('capture: fixture server never came up'));
          return;
        }
        setTimeout(() => attempt(left - 1), 200);
      });
    };
    attempt(tries);
  });
}

async function captureTheme(browser, theme, outFile) {
  const context = await browser.newContext({
    viewport: { width: 900, height: 700 },
    colorScheme: theme,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.waitForTimeout(2500); // let the intro start/done settle
  await page.evaluate(() => {
    const panel = document.querySelector('.demo-panel');
    window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  });
  const box = await page.locator('.demo-panel').boundingBox();
  const clip = {
    x: 0,
    y: Math.max(0, Math.floor(box.y)),
    width: 900,
    height: Math.min(700 - Math.floor(box.y), Math.ceil(box.height) + 4)
  };

  const frames = [];
  const pending = schedule.slice();
  const started = Date.now();
  const totalFrames = Math.round(endMs / frameMs);
  for (let i = 0; i < totalFrames; i += 1) {
    const elapsed = Date.now() - started;
    while (pending.length && pending[0][0] <= elapsed) {
      const [, selector] = pending.shift();
      await page.locator(selector).click();
    }
    frames.push(PNG.sync.read(await page.screenshot({ clip })));
    const wait = started + (i + 1) * frameMs - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
  }
  await context.close();
  console.log(`capture: ${theme} took ${frames.length} frames`);

  // One global palette sampled across states so colors stay stable. Slot 0
  // is a reserved dummy that no real pixel may use: it is the transparent
  // index, and giving it a real color would repaint every pixel of that
  // color wherever anything changes.
  const samples = [frames[0].data, frames[Math.floor(frames.length / 2)].data,
    frames[frames.length - 1].data];
  const combined = Buffer.concat(samples.map((data) => Buffer.from(data)));
  const palette = [[255, 0, 255, 255],
    ...quantize(combined, colors - 1, { format: 'rgba4444' })];
  // Unchanged pixels go transparent so static regions cost almost nothing.
  // Slot 0 stays unused by real pixels (nearestIndex starts at 1), so the
  // transparent index can never collide with a real color.
  const TRANSPARENT_INDEX = 0;
  const gif = GIFEncoder();
  const colorCache = new Map();
  let prevData = null;
  frames.forEach((frame, i) => {
    const index = mapExact(frame.data, palette, colorCache);
    if (i === 0) {
      gif.writeFrame(index, frame.width, frame.height, {
        palette,
        delay: frameMs,
        repeat: 0
      });
    } else {
      const data = frame.data;
      for (let p = 0; p < data.length; p += 4) {
        if (data[p] === prevData[p] && data[p + 1] === prevData[p + 1] &&
            data[p + 2] === prevData[p + 2] && data[p + 3] === prevData[p + 3]) {
          index[p >> 2] = TRANSPARENT_INDEX;
        }
      }
      gif.writeFrame(index, frame.width, frame.height, {
        delay: frameMs,
        transparent: true,
        transparentIndex: TRANSPARENT_INDEX,
        dispose: 1
      });
    }
    prevData = frame.data;
  });
  gif.finish();
  fs.writeFileSync(outFile, Buffer.from(gif.bytes()));
  console.log(`capture: wrote ${path.relative(root, outFile)} ` +
    `(${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
}

async function main() {
  const server = spawn('node', [path.join(__dirname, 'fixture-server.cjs')], {
    env: Object.assign({}, process.env, { PLAYWRIGHT_PORT: String(port) }),
    stdio: 'ignore'
  });
  try {
    await waitForServer();
    const browser = await chromium.launch();
    try {
      await captureTheme(browser, 'light', path.join(root, 'docs', 'output-demo.gif'));
      await captureTheme(browser, 'dark', path.join(root, 'docs', 'output-demo-dark.gif'));
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
