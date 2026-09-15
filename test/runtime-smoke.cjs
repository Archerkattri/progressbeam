const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const commonjs = require(root);

assert.equal(typeof commonjs.start, 'function');
assert.equal(commonjs.isRendered(), false);

const esm = childProcess.spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "import ProgressBeam from 'progressbeam'; if (typeof ProgressBeam.start !== 'function') process.exit(1);"
  ],
  { cwd: root, encoding: 'utf8' }
);

if (esm.error) throw esm.error;
if (esm.status !== 0) {
  process.stderr.write(esm.stderr || 'ESM runtime smoke test failed\n');
  process.exit(esm.status || 1);
}

console.log(`Node ${process.versions.node} runtime imports: ok`);
