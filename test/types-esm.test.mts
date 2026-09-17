import DefaultBeam, { ProgressBeam as NamedBeam } from 'progressbeam';
import type { ProgressBeamApi, ProgressBeamSettings } from 'progressbeam';

const bars: ProgressBeamApi[] = [DefaultBeam, NamedBeam];
for (const bar of bars) {
  const settings: ProgressBeamSettings = bar.settings;
  void settings;
  bar.configure({ minimum: 0.08 }).start().set(0.4).inc().done();
  bar.on('fail', (event) => { const failed: boolean = bar.failed; void failed; void event; });
}
