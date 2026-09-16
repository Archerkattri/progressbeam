import type { ProgressBeamApi } from '../progressbeam';

export interface TanStackRouterLike {
  subscribe(event: 'onBeforeLoad' | 'onResolved', handler: (event?: { hrefChanged?: boolean }) => void): () => void;
}

export interface TanStackBindingOptions {
  disableSameURL?: boolean;
}

export function bindTanStackRouter(
  router: TanStackRouterLike,
  bar?: ProgressBeamApi,
  options?: TanStackBindingOptions
): () => void;
