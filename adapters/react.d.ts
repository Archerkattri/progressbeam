import type { ProgressBeamApi } from '../progressbeam';

export function useProgressBeam(active: boolean, bar?: ProgressBeamApi): ProgressBeamApi;
export function trackPromise<T>(promise: PromiseLike<T>, bar?: ProgressBeamApi): PromiseLike<T>;
