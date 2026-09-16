const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
// Raw and gzip budgets in bytes. Bump deliberately: size is a feature.
const budgets = {
  'progressbeam.js': { raw: 32000, gzip: 9500 },
  'progressbeam.mjs': { raw: 2000, gzip: 1000 },
  'progressbeam.css': { raw: 6000, gzip: 2500 },
  'adapters/history.mjs': { raw: 3000, gzip: 1500 },
  'adapters/react.mjs': { raw: 2000, gzip: 1000 },
  'adapters/next.mjs': { raw: 3000, gzip: 1500 },
  'adapters/vue.mjs': { raw: 2000, gzip: 1000 }
};

for (const [file, budget] of Object.entries(budgets)) {
  const bytes = fs.readFileSync(path.join(root, file));
  const gzipped = zlib.gzipSync(bytes).length;
  assert.ok(
    bytes.length <= budget.raw,
    `${file}: raw ${bytes.length}B exceeds ${budget.raw}B budget`
  );
  assert.ok(
    gzipped <= budget.gzip,
    `${file}: gzip ${gzipped}B exceeds ${budget.gzip}B budget`
  );
  console.log(`${file}: raw ${bytes.length}B, gzip ${gzipped}B`);
}
console.log('Size budgets: ok');
