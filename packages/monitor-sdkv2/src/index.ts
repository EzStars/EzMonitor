export { default as createSDK } from './factory/createSDK'
export type { SDKStatus } from './factory/createSDK'

export { TrackingPlugin } from './plugins/tracking/TrackingPlugin'
export type { TrackingPluginConfig } from './plugins/tracking/types'

export type { SDKConfig } from './types/config'
export { Reporter } from './reporting/Reporter'
export type {
	ITransportAdapter,
	ReportEnvelope,
	ReportTransportType,
	ReporterLike,
	ReporterOptions,
	ReporterRuntimeConfig,
	StorageLike,
} from './reporting/types'
