export type WebClientHandler<T = any> = (event: T) => T;

// export interface WebClient {
//   on(
//     action: ActionType.on,
//     type: LifecycleEvent,
//     handler: WebClientHandler,
//   ): void;
//   emit(action: ActionType.emit, type: LifecycleEvent, payload?: any): void;
// }
export type WebClient = (
  action: 'on' | 'emit',
  type: LifecycleEvent,
  handler?: WebClientHandler,
  payload?: any,
) => void;

export enum ActionType {
  on = 'on',
  emit = 'emit',
}
export enum LifecycleEvent {
  init = 'init',
  ready = 'ready',
  beforeReport = 'before-report',
  afterReport = 'after-report',
  error = 'error',
}
