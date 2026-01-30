import type { SDKConfig } from './config'

/**
 * 事件载荷基础类型
 */
export interface BaseEventPayload {
  timestamp: number
  appId?: string
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

/**
 * 系统事件类型
 */
export interface SystemEvents {
  'sdk:init': { config: SDKConfig }
  'sdk:start': Record<string, never>
  'sdk:stop': Record<string, never>
  'sdk:destroy': Record<string, never>
  'plugin:registered': { pluginName: string }
  'plugin:initialized': { pluginName: string }
  'plugin:started': { pluginName: string }
  'plugin:stopped': { pluginName: string }
  'plugin:destroyed': { pluginName: string }
  'plugin:error': { pluginName: string, error: Error }
  'config:changed': { key: string, value: unknown, oldValue: unknown }
}

/**
 * 数据上报事件类型
 */
export interface ReportEvents {
  'report:data': { type: string, data: unknown }
  'report:batch': { items: unknown[] }
  'report:success': { data: unknown }
  'report:error': { data: unknown, error: Error }
}

/**
 * 自定义埋点事件类型
 */
export interface TrackingEvents {
  'tracking:event': {
    eventName: string
    properties?: Record<string, unknown>
    context?: Record<string, unknown>
  }
  'tracking:page': {
    page: string
    properties?: Record<string, unknown>
    context?: Record<string, unknown>
  }
  'tracking:user': { userId: string, properties?: Record<string, unknown> }
  'tracking:batch': { events: unknown[] }
}

/**
 * 所有事件类型合集
 */
export type AllEvents = SystemEvents & ReportEvents & TrackingEvents

/**
 * 事件名称类型
 */
export type EventName = keyof AllEvents

/**
 * 事件处理器类型
 */
export type EventHandler<T extends EventName> = (
  payload: AllEvents[T] & BaseEventPayload,
) => void | Promise<void>

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
} as const

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

  // 自定义埋点事件
  TRACKING_EVENT: 'tracking:event',
  TRACKING_PAGE: 'tracking:page',
  TRACKING_USER: 'tracking:user',
  TRACKING_BATCH: 'tracking:batch',
} as const
