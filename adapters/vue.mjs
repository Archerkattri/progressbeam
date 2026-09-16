// Vue adapter (peer dependency: vue). The composable finishes a running
// indicator when its component unmounts; router integration uses the
// framework-agnostic bindRouterGuards from ./history.mjs.
import { onUnmounted } from 'vue';
import ProgressBeam from '../progressbeam.mjs';

export function useProgressBeam(bar = ProgressBeam) {
  onUnmounted(() => { if (bar.isStarted()) bar.done(); });
  return bar;
}

export { bindRouterGuards, createFetchTracker } from './history.mjs';
