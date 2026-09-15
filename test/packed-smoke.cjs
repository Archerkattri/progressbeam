const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nprogress-packed-'));
const cache = path.join(tempRoot, 'npm-cache');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = Object.assign({}, process.env, { npm_config_cache: cache });

function run(command, args, options) {
  if (process.platform === 'win32' && /(?:npm|npx)\.cmd$/.test(command)) {
    const quote = (value) => {
      value = String(value);
      return /[\s"&|<>^]/.test(value) ? '"' + value.replace(/"/g, '\\"') + '"' : value;
    };
    return childProcess.execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command].concat(args).map(quote).join(' ')],
      options
    );
  }
  return childProcess.execFileSync(command, args, options);
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
    ['-e', "const NProgress=require('nprogress'); if (typeof NProgress.start !== 'function' || NProgress.isRendered()) process.exit(1)"],
    { cwd: consumer, env, stdio: 'inherit' }
  );
  run(
    process.execPath,
    ['--input-type=module', '-e', "import NProgress from 'nprogress'; if (typeof NProgress.cancel !== 'function') process.exit(1)"],
    { cwd: consumer, env, stdio: 'inherit' }
  );

  const typecheckDir = path.join(consumer, 'types');
  fs.mkdirSync(typecheckDir);
  fs.writeFileSync(path.join(typecheckDir, 'index.ts'), "import NProgress = require('nprogress'); NProgress.configure({ maximum: 0.9 }); NProgress.cancel();\n");
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

  assert.equal(fs.existsSync(path.join(consumer, 'node_modules', 'nprogress', 'nprogress.css')), true);
  console.log('Packed tarball consumer checks: ok');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
