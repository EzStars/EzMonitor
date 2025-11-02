/**
 * 事件载荷基础类型
 */
export interface BaseEventPayload {
  timestamp: number;
  appId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * 系统事件类型
 */
export interface SystemEvents {
  'sdk:init': { config: any };
  'sdk:start': {};
  'sdk:stop': {};
  'sdk:destroy': {};
  'plugin:registered': { pluginName: string };
  'plugin:initialized': { pluginName: string };
  'plugin:started': { pluginName: string };
  'plugin:stopped': { pluginName: string };
  'plugin:destroyed': { pluginName: string };
  'plugin:error': { pluginName: string; error: Error };
  'config:changed': { key: string; value: any; oldValue: any };
}

/**
 * 数据上报事件类型
 */
export interface ReportEvents {
  'report:data': { type: string; data: any };
  'report:batch': { items: any[] };
  'report:success': { data: any };
  'report:error': { data: any; error: Error };
}

/**
 * 所有事件类型合集
 */
export type AllEvents = SystemEvents & ReportEvents;

/**
 * 事件名称类型
 */
export type EventName = keyof AllEvents;

/**
 * 事件处理器类型
 */
export type EventHandler<T extends EventName> = (
  payload: AllEvents[T] & BaseEventPayload,
) => void | Promise<void>;

/**
 * DOM 事件常量
 * 用于浏览器 DOM 事件监听
 */
export const DOM_EVENTS = {
  /** 配置变更事件 */
  CONFIG_CHANGED: 'ezmonitor:config:changed',
  /** SDK 状态变更事件 */
  STATUS_CHANGED: 'ezmonitor:status:changed',
  /** 插件生命周期事件 */
  PLUGIN_LIFECYCLE: 'ezmonitor:plugin:lifecycle',
} as const;

/**
 * 内部事件常量
 * 用于 EventBus 内部通信
 */
export const INTERNAL_EVENTS = {
  // SDK 生命周期事件
  SDK_INIT: 'sdk:init',
  SDK_START: 'sdk:start',
  SDK_STOP: 'sdk:stop',
  SDK_DESTROY: 'sdk:destroy',

  // 插件生命周期事件
  PLUGIN_REGISTERED: 'plugin:registered',
  PLUGIN_INITIALIZED: 'plugin:initialized',
  PLUGIN_STARTED: 'plugin:started',
  PLUGIN_STOPPED: 'plugin:stopped',
  PLUGIN_DESTROYED: 'plugin:destroyed',
  PLUGIN_ERROR: 'plugin:error',

  // 配置变更事件
  CONFIG_CHANGED: 'config:changed',

  // 数据上报事件
  REPORT_DATA: 'report:data',
  REPORT_BATCH: 'report:batch',
  REPORT_SUCCESS: 'report:success',
  REPORT_ERROR: 'report:error',
} as const;
