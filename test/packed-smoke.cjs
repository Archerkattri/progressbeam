const assert = require('node:assert/strict');
const spawn = require('cross-spawn');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'progressbeam-packed-'));
const cache = path.join(tempRoot, 'npm-cache');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = Object.assign({}, process.env, { npm_config_cache: cache });

function run(command, args, options) {
  const result = spawn.sync(command, args, options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(command + ' exited with status ' + result.status);
  }
  return result.stdout;
}

try {
  const packOutput = run(
    npm,
    ['pack', '--json', '--pack-destination', tempRoot],
    { cwd: root, env, encoding: 'utf8' }
  );
  const packResult = JSON.parse(packOutput)[0];
  const tarball = path.join(tempRoot, packResult.filename);
  const consumer = path.join(tempRoot, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"private":true}\n');

  run(
    npm,
    ['install', '--no-save', '--package-lock=false', '--ignore-scripts', tarball],
    { cwd: consumer, env, stdio: 'inherit' }
  );

  run(
    process.execPath,
    ['-e', "const ProgressBeam=require('progressbeam'); if (typeof ProgressBeam.start !== 'function' || ProgressBeam.isRendered()) process.exit(1)"],
    { cwd: consumer, env, stdio: 'inherit' }
  );
  run(
    process.execPath,
    ['--input-type=module', '-e', "import ProgressBeam from 'progressbeam'; if (typeof ProgressBeam.cancel !== 'function') process.exit(1)"],
    { cwd: consumer, env, stdio: 'inherit' }
  );

  const typecheckDir = path.join(consumer, 'types');
  fs.mkdirSync(typecheckDir);
  fs.writeFileSync(path.join(typecheckDir, 'index.ts'), "import ProgressBeam = require('progressbeam'); ProgressBeam.configure({ maximum: 0.9 }); ProgressBeam.cancel();\n");
  fs.writeFileSync(path.join(typecheckDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: 'ES2022',
      module: 'Node16',
      moduleResolution: 'Node16',
      lib: ['ES2022', 'DOM']
    },
    files: ['index.ts']
  }));
  run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--no-install', 'tsc', '--project', path.join(typecheckDir, 'tsconfig.json')],
    { cwd: root, env, stdio: 'inherit' }
  );

  assert.equal(fs.existsSync(path.join(consumer, 'node_modules', 'progressbeam', 'progressbeam.css')), true);
  console.log('Packed tarball consumer checks: ok');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
