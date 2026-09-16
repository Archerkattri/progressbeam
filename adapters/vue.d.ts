import type { ProgressBeamApi } from '../progressbeam';

export function useProgressBeam(bar?: ProgressBeamApi): ProgressBeamApi;
export { bindRouterGuards, createFetchTracker } from './history';
export type { FetchLike, TrackedFetch, GuardRouter } from './history';
