// React adapter (peer dependency: react). Tracks a boolean loading state;
// the indicator finishes automatically when the effect cleans up.
import { useEffect } from 'react';
import ProgressBeam from '../progressbeam.mjs';

export function useProgressBeam(active, bar = ProgressBeam) {
  useEffect(() => {
    if (!active) return undefined;
    bar.start();
    return () => { bar.done(); };
  }, [active, bar]);
  return bar;
}

export function trackPromise(promise, bar = ProgressBeam) {
  bar.promise(promise);
  return promise;
}
