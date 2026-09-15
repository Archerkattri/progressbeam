import NProgress = require('nprogress');

NProgress.configure({
  minimum: 0.1,
  maximum: 0.99,
  barColor: '#2563eb',
  failureColor: '#dc2626',
  indeterminate: true,
  ariaLabel: 'Loading',
  height: '3px',
  zIndex: 2000
});
NProgress.on('progress', (event) => { const current: number | null = event.progress; void current; });
NProgress.off('progress');

NProgress.start().set(0.5).inc().pause().resume().done();
NProgress.fail(true);
NProgress.cancel();
NProgress.promise(Promise.resolve('complete'));
const rendered: HTMLElement = NProgress.render();
void rendered;
