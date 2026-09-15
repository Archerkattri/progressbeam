import ProgressBeam = require('progressbeam');

ProgressBeam.configure({
  minimum: 0.1,
  maximum: 0.99,
  barColor: '#2563eb',
  failureColor: '#dc2626',
  indeterminate: true,
  ariaLabel: 'Loading',
  height: '3px',
  zIndex: 2000
});
ProgressBeam.on('progress', (event) => { const current: number | null = event.progress; void current; });
ProgressBeam.off('progress');

ProgressBeam.start().set(0.5).inc().pause().resume().done();
ProgressBeam.fail(true);
ProgressBeam.cancel();
ProgressBeam.promise(Promise.resolve('complete'));
const rendered: HTMLElement = ProgressBeam.render();
void rendered;
