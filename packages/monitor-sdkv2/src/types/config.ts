export interface SDKPluginSettings {
  tracking?: Record<string, unknown>
  error?: Record<string, unknown>
  [pluginName: string]: Record<string, unknown> | undefined
}

export interface ReporterSecurityConfig {
  redactPatterns?: Array<string | RegExp>
  redactReplacement?: string
  maxErrorStackFrames?: number
  maxErrorMessageLength?: number
  beforeSend?: (
    eventType: string,
    payload: Record<string, unknown>,
  ) => Record<string, unknown> | null | undefined
}

export interface SDKConfig {
  appId?: string
  appVersion?: string
  release?: string
  environment?: string
  userId?: string
  sessionId?: string
  reportUrl?: string
  enabled?: boolean
  debug?: boolean
  batchSize?: number
  batchInterval?: number
  enableBatch?: boolean
  forceXHR?: boolean
  enableRetry?: boolean
  maxRetryCount?: number
  retryDelay?: number
  enableLocalStorage?: boolean
  localStorageKey?: string
  cacheExpireTime?: number
  security?: ReporterSecurityConfig
  pluginSettings?: SDKPluginSettings
  [key: string]: unknown
}

export const DEFAULT_CONFIG: Required<
  Pick<
    SDKConfig,
    | 'enabled'
    | 'debug'
    | 'batchSize'
    | 'batchInterval'
    | 'enableBatch'
    | 'forceXHR'
    | 'enableRetry'
    | 'maxRetryCount'
    | 'retryDelay'
    | 'enableLocalStorage'
    | 'localStorageKey'
    | 'cacheExpireTime'
  >
> = {
  enabled: true,
  debug: false,
  batchSize: 50,
  batchInterval: 10000,
  enableBatch: true,
  forceXHR: false,
  enableRetry: true,
  maxRetryCount: 3,
  retryDelay: 1000,
  enableLocalStorage: true,
  localStorageKey: 'ez_monitor_report_queue',
  cacheExpireTime: 24 * 60 * 60 * 1000,
}
