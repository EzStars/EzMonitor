// 核心类与工具
export { ConfigManager } from './core/ConfigManager'
export { EventBus } from './core/EventBus' // 仅导出类，不导出默认实例
export { createPluginContext } from './core/PluginContext'
export type {
  LoggerFacade,
  PluginContext,
  ReporterFacade,
} from './core/PluginContext'
export { PluginManager } from './core/PluginManager'
export { Reporter } from './core/Reporter'
export { ReportQueue } from './core/ReportQueue'
// 类型仅导出（避免生成运行时代码）
export type { ReportQueueConfig, ReportQueueItem } from './core/ReportQueue'
export { SDKCore } from './core/SDKCore'

export { DefaultTransportStrategy } from './core/transports/strategy'
export type { TransportStrategy } from './core/transports/strategy'
export { TypedEventBus } from './core/TypedEventBus'
export { SDKStatus } from './core/types/core'
export type { ISDKCore } from './core/types/core'

export { TransportType } from './core/types/reporter'
export type {
  IReporter,
  PendingReportItem,
  ReporterConfig,
  ReportPayload,
  ReportResponse,
  RetryStrategy,
} from './core/types/reporter'
// 工厂函数
export { default as createSDK } from './createSDK'
export { ExamplePlugin } from './plugins/example/ExamplePlugin'
// 插件（显式导出）
export { TrackingPlugin } from './plugins/tracking'
export { ContextCollector } from './plugins/tracking/ContextCollector'
export type {
  TrackingContext,
  TrackingEventData,
  TrackingPageData,
  TrackingPluginConfig,
  TrackingUserData,
} from './plugins/tracking/types'
// 基础类型与常量（显式导出）
export { DEFAULT_CONFIG } from './types/config'

export type { IConfigManager, SDKConfig } from './types/config'
export { DOM_EVENTS, INTERNAL_EVENTS } from './types/events'
export type {
  AllEvents,
  BaseEventPayload,
  EventHandler,
  EventName,
  ReportEvents,
  SystemEvents,
  TrackingEvents,
} from './types/events'
export { PluginStatus } from './types/plugin'

export type {
  IPlugin,
  IPluginManager,
  PluginConstructor,
  PluginRegistration,
} from './types/plugin'
