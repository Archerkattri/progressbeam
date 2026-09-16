import type { ProgressBeamApi } from '../progressbeam';

export interface AppRouterTracker {
  start(): void;
  finish(pathname: string): void;
  fail(): void;
  cancel(): void;
}

export function createAppRouterTracker(bar?: ProgressBeamApi): AppRouterTracker;
export { useProgressBeam, trackPromise } from './react';
