export { default as createSDK } from './factory/createSDK'
export type { SDKStatus } from './factory/createSDK'

export { ErrorPlugin } from './plugins/error/ErrorPlugin'
export type { ErrorFrame, ErrorPluginConfig, ErrorPluginPayload } from './plugins/error/types'

export { PerformancePlugin } from './plugins/performance/PerformancePlugin'
export type { PerformanceMetricName, PerformancePluginConfig } from './plugins/performance/types'

export { ReplayPlugin } from './plugins/replay/ReplayPlugin'
export type {
  ReplayErrorContext,
  ReplayEventRecord,
  ReplayEventType,
  ReplayPluginConfig,
  ReplaySegmentContext,
} from './plugins/replay/types'

export { TrackingPlugin } from './plugins/tracking/TrackingPlugin'
export type {
  TrackingEventData,
  TrackingPageData,
  TrackingPluginConfig,
  TrackingUserData,
  TrackingUVData,
} from './plugins/tracking/types'

export { Reporter } from './reporting/Reporter'
export type {
  ITransportAdapter,
  ReportEnvelope,
  ReporterLike,
  ReporterOptions,
  ReporterRuntimeConfig,
  ReportTransportType,
  StorageLike,
} from './reporting/types'

export type { SDKConfig } from './types/config'
