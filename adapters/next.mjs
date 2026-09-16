// Next.js App Router adapter (peer dependency: react). The App Router
// exposes no navigation events, so tracking is driven explicitly: call
// start() from link click handlers and finish(pathname) from an effect
// keyed on usePathname(). Re-exports the React adapter helpers.
import ProgressBeam from '../progressbeam.mjs';

export function createAppRouterTracker(bar = ProgressBeam) {
  let lastPathname;
  return {
    start() { bar.start(); },
    finish(pathname) {
      if (pathname !== lastPathname) {
        lastPathname = pathname;
        bar.done();
      }
    },
    fail() { bar.fail(); },
    cancel() { bar.cancel(); }
  };
}

export { useProgressBeam, trackPromise } from './react.mjs';
