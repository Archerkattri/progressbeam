// Vanilla framework adapter: fetch tracking and router-guard binding with
// zero dependencies. Works anywhere fetch exists (browsers, Node 18+).
import ProgressBeam from '../progressbeam.mjs';

export function createFetchTracker(bar = ProgressBeam, fetchFn) {
  const runFetch = fetchFn ||
    (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (typeof runFetch !== 'function') {
    throw new Error('progressbeam/adapters: no fetch implementation available');
  }
  let pending = 0;
  function settle() {
    pending -= 1;
    if (pending === 0) bar.done();
  }
  function trackedFetch(input, init) {
    if (pending === 0) bar.start();
    pending += 1;
    return runFetch(input, init).then(
      (response) => { settle(); return response; },
      (error) => { settle(); throw error; }
    );
  }
  trackedFetch.pending = () => pending;
  return trackedFetch;
}

export function bindRouterGuards(router, bar = ProgressBeam) {
  const removeBefore = router.beforeEach((to, from, next) => {
    bar.start();
    if (typeof next === 'function') next();
  });
  const removeAfter = router.afterEach(() => { bar.done(); });
  const removeError = typeof router.onError === 'function'
    ? router.onError(() => { bar.fail(); })
    : () => undefined;
  return function unbind() {
    if (typeof removeBefore === 'function') removeBefore();
    if (typeof removeAfter === 'function') removeAfter();
    removeError();
  };
}
