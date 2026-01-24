// 核心类与工具
export { ConfigManager } from './core/ConfigManager';
export { PluginManager } from './core/PluginManager';
export { SDKCore } from './core/SDKCore';
export { EventBus } from './core/EventBus'; // 仅导出类，不导出默认实例
export { Reporter } from './core/Reporter';
export { ReportQueue } from './core/ReportQueue';
export { TypedEventBus } from './core/TypedEventBus';
export { createPluginContext } from './core/PluginContext';
export { DefaultTransportStrategy } from './core/transports/strategy';

// 类型仅导出（避免生成运行时代码）
export type { ReportQueueConfig, ReportQueueItem } from './core/ReportQueue';
export { TransportType } from './core/types/reporter';
export type {
  IReporter,
  ReporterConfig,
  ReportPayload,
  ReportResponse,
  PendingReportItem,
  RetryStrategy,
} from './core/types/reporter';
export type {
  ReporterFacade,
  LoggerFacade,
  PluginContext,
} from './core/PluginContext';
export type { TransportStrategy } from './core/transports/strategy';

// 基础类型与常量（显式导出）
export { DEFAULT_CONFIG } from './types/config';
export type { SDKConfig, IConfigManager } from './types/config';
export { PluginStatus } from './types/plugin';
export type {
  IPlugin,
  PluginConstructor,
  PluginRegistration,
  IPluginManager,
} from './types/plugin';
export { DOM_EVENTS, INTERNAL_EVENTS } from './types/events';
export type {
  BaseEventPayload,
  SystemEvents,
  ReportEvents,
  TrackingEvents,
  AllEvents,
  EventName,
  EventHandler,
} from './types/events';
export { SDKStatus } from './core/types/core';
export type { ISDKCore } from './core/types/core';

// 插件（显式导出）
export { TrackingPlugin } from './plugins/tracking';
export type {
  TrackingEventData,
  TrackingPageData,
  TrackingUserData,
  TrackingPluginConfig,
  TrackingContext,
} from './plugins/tracking/types';
export { ContextCollector } from './plugins/tracking/ContextCollector';
export { ExamplePlugin } from './plugins/example/ExamplePlugin';

// 工厂函数
export { default as createSDK } from './createSDK';
