const assert = require('node:assert/strict');
const spawn = require('cross-spawn');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'progressbeam-pack-check-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = Object.assign({}, process.env, {
  npm_config_cache: path.join(tempRoot, 'npm-cache')
});

function runNpm(args) {
  const result = spawn.sync(npm, args, { cwd: root, env, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('npm ' + args.join(' ') + ' exited with status ' + result.status + ': ' + result.stderr);
  }
  return result.stdout;
}

try {
  const result = JSON.parse(runNpm(['pack', '--dry-run', '--json']))[0];
  const actual = result.files.map((file) => file.path).sort();
  const expected = [
    'History.md',
    'License.md',
    'MIGRATION.md',
    'Readme.md',
    'progressbeam.css',
    'progressbeam.d.mts',
    'progressbeam.d.ts',
    'progressbeam.js',
    'progressbeam.mjs',
    'adapters/history.mjs',
    'adapters/history.d.ts',
    'adapters/react.mjs',
    'adapters/react.d.ts',
    'adapters/next.mjs',
    'adapters/next.d.ts',
    'adapters/vue.mjs',
    'adapters/vue.d.ts',
    'adapters/tanstack.mjs',
    'adapters/tanstack.d.ts',
    'docs/output-demo.gif',
    'docs/output-demo-dark.gif',
    'package.json'
  ].sort();
  assert.deepEqual(actual, expected);
  console.log('Package contents: ok');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
