const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const adapters = ['history.mjs', 'react.mjs', 'next.mjs', 'vue.mjs', 'tanstack.mjs'];

function stubBar(calls) {
  return {
    start: () => { calls.push('start'); },
    done: () => { calls.push('done'); },
    fail: () => { calls.push('fail'); }
  };
}

async function main() {
  for (const file of adapters) {
    childProcess.execFileSync(
      process.execPath,
      ['--check', path.join(root, 'adapters', file)],
      { stdio: 'pipe' }
    );
  }
  console.log('Adapter syntax: ok');

  const history = await import(pathToFileURL(path.join(root, 'adapters', 'history.mjs')).href);

  const calls = [];
  const bar = stubBar(calls);
  const seen = [];
  const fakeFetch = (input) => {
    seen.push(input);
    return Promise.resolve({ ok: true, input });
  };
  const tracked = history.createFetchTracker(bar, fakeFetch);
  assert.equal(tracked.pending(), 0);
  const [first, second] = await Promise.all([tracked('/a'), tracked('/b')]);
  assert.equal(first.input, '/a');
  assert.equal(second.input, '/b');
  assert.deepEqual(seen, ['/a', '/b']);
  assert.equal(tracked.pending(), 0);
  assert.deepEqual(calls, ['start', 'done']);

  const failing = history.createFetchTracker(
    bar, () => Promise.reject(new Error('boom'))
  );
  calls.length = 0;
  await assert.rejects(() => failing('/x'), /boom/);
  assert.deepEqual(calls, ['start', 'done']);

  const hooks = {};
  const router = {
    beforeEach: (fn) => { hooks.before = fn; return () => { hooks.before = null; }; },
    afterEach: (fn) => { hooks.after = fn; return () => { hooks.after = null; }; },
    onError: (fn) => { hooks.error = fn; return () => { hooks.error = null; }; }
  };
  calls.length = 0;
  const unbind = history.bindRouterGuards(router, bar);
  let continued = false;
  hooks.before({}, {}, () => { continued = true; });
  assert.equal(continued, true);
  hooks.after();
  hooks.error();
  assert.deepEqual(calls, ['start', 'done', 'fail']);
  unbind();
  assert.equal(hooks.before, null);
  assert.equal(hooks.after, null);
  assert.equal(hooks.error, null);

  const minimal = { beforeEach: router.beforeEach, afterEach: router.afterEach };
  history.bindRouterGuards(minimal, bar)();

  const tanstack = await import(pathToFileURL(path.join(root, 'adapters', 'tanstack.mjs')).href);
  const subscriptions = {};
  const tanstackRouter = {
    subscribe: (event, handler) => {
      subscriptions[event] = handler;
      return () => { delete subscriptions[event]; };
    }
  };
  calls.length = 0;
  const unbindTanStack = tanstack.bindTanStackRouter(tanstackRouter, bar);
  subscriptions.onBeforeLoad({ hrefChanged: false });
  assert.deepEqual(calls, []);
  subscriptions.onBeforeLoad({ hrefChanged: true });
  subscriptions.onResolved();
  assert.deepEqual(calls, ['start', 'done']);
  unbindTanStack();
  assert.deepEqual(Object.keys(subscriptions), []);
  console.log('Adapter behavior: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
