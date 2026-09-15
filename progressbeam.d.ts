export interface ProgressBeamSettings {
  minimum: number;
  easing: string;
  positionUsing: string;
  speed: number;
  trickle: boolean;
  trickleSpeed: number;
  maximum: number;
  showBar: boolean;
  showSpinner: boolean;
  delay: number;
  barSelector: string;
  spinnerSelector: string;
  barColor: string | null;
  spinnerColor: string | null;
  failureColor: string | null;
  indeterminate: boolean;
  rtl: boolean;
  ariaLabel: string | null;
  height: string | null;
  zIndex: number | string | null;
  parent: string | Element;
  template: string;
}

export type ProgressBeamEventName = 'start' | 'progress' | 'done' | 'remove' | 'cancel' | 'pause' | 'resume' | 'fail';

export interface ProgressBeamEvent {
  progress: number | null;
  status: number | null;
}

export type ProgressBeamEventHandler = (event: ProgressBeamEvent) => void;

export interface ProgressBeamApi {
  readonly version: string;
  settings: ProgressBeamSettings;
  status: number | null;
  failed: boolean;
  paused: boolean;
  on(event: ProgressBeamEventName, handler: ProgressBeamEventHandler): this;
  off(event?: ProgressBeamEventName, handler?: ProgressBeamEventHandler): this;
  configure(options: Partial<ProgressBeamSettings>): this;
  set(progress: number): this;
  isStarted(): boolean;
  start(): this;
  done(force?: boolean): this;
  fail(force?: boolean): this;
  inc(amount?: number): this;
  trickle(): this;
  pause(): this;
  resume(): this;
  promise<T>(promise: PromiseLike<T> | { always(callback: () => void): unknown }): this;
  render(fromStart?: boolean): HTMLElement;
  remove(): this;
  cancel(): this;
  isRendered(): boolean;
  getPositioningCSS(): string;
}

declare const ProgressBeam: ProgressBeamApi;

export = ProgressBeam;
