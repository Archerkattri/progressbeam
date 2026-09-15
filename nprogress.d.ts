export interface NProgressSettings {
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

export type NProgressEventName = 'start' | 'progress' | 'done' | 'remove' | 'cancel' | 'pause' | 'resume' | 'fail';

export interface NProgressEvent {
  progress: number | null;
  status: number | null;
}

export type NProgressEventHandler = (event: NProgressEvent) => void;

export interface NProgressApi {
  readonly version: string;
  settings: NProgressSettings;
  status: number | null;
  failed: boolean;
  paused: boolean;
  on(event: NProgressEventName, handler: NProgressEventHandler): this;
  off(event?: NProgressEventName, handler?: NProgressEventHandler): this;
  configure(options: Partial<NProgressSettings>): this;
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

declare const NProgress: NProgressApi;

export = NProgress;
