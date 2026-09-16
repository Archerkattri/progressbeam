// TanStack Router adapter (no runtime dependency; works with
// @tanstack/react-router, @tanstack/vue-router, and other framework
// bindings exposing router.subscribe). Starts on committed navigations,
// finishes when the router resolves, and skips same-URL events.
import ProgressBeam from '../progressbeam.mjs';

export function bindTanStackRouter(router, bar = ProgressBeam, options = {}) {
  const disableSameURL = options.disableSameURL !== false;
  const unsubscribeStart = router.subscribe('onBeforeLoad', (event) => {
    if (disableSameURL && event && event.hrefChanged === false) return;
    bar.start();
  });
  const unsubscribeStop = router.subscribe('onResolved', () => {
    bar.done();
  });
  return function unbind() {
    unsubscribeStart();
    unsubscribeStop();
  };
}
