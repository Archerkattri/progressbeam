import ProgressBeam = require('progressbeam');
import { createFetchTracker, bindRouterGuards } from 'progressbeam/adapters/history';
import { useProgressBeam as useReactProgress, trackPromise } from 'progressbeam/adapters/react';
import { createAppRouterTracker } from 'progressbeam/adapters/next';
import { useProgressBeam as useVueProgress } from 'progressbeam/adapters/vue';

ProgressBeam.configure({
  minimum: 0.1,
  maximum: 0.99,
  barColor: '#2563eb',
  failureColor: '#dc2626',
  indeterminate: true,
  ariaLabel: 'Loading',
  height: '3px',
  zIndex: 2000,
  position: 'bottom'
});
ProgressBeam.on('progress', (event) => { const current: number | null = event.progress; void current; });
ProgressBeam.off('progress');

ProgressBeam.start().set(0.5).inc().dec().dec(0.2).pause().resume().done();
ProgressBeam.fail(true);
ProgressBeam.cancel();
ProgressBeam.promise(Promise.resolve('complete'));
const rendered: HTMLElement = ProgressBeam.render();
void rendered;

const tracked = createFetchTracker(ProgressBeam, (input: any) => fetch(input));
void tracked.pending();
const unbind = bindRouterGuards({
  beforeEach: (guard) => { void guard; return () => undefined; },
  afterEach: (guard) => { void guard; return () => undefined; }
});
void unbind;
void useReactProgress;
void trackPromise;
const appTracker = createAppRouterTracker();
appTracker.finish('/');
void appTracker;
void useVueProgress;
