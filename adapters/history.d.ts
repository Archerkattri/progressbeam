import type { ProgressBeamApi } from '../progressbeam';

export type FetchLike = (input: any, init?: any) => Promise<any>;

export interface TrackedFetch {
  (input: any, init?: any): Promise<any>;
  pending(): number;
}

export function createFetchTracker(bar?: ProgressBeamApi, fetchFn?: FetchLike): TrackedFetch;

export interface GuardRouter {
  beforeEach(guard: (to: unknown, from: unknown, next?: () => void) => void): () => void;
  afterEach(guard: () => void): () => void;
  onError?(handler: () => void): () => void;
}

export function bindRouterGuards(router: GuardRouter, bar?: ProgressBeamApi): () => void;
