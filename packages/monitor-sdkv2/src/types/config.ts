export interface SDKPluginSettings {
  tracking?: Record<string, unknown>
  [pluginName: string]: Record<string, unknown> | undefined
}

export interface SDKConfig {
  appId?: string
  appVersion?: string
  userId?: string
  sessionId?: string
  reportUrl?: string
  enabled?: boolean
  debug?: boolean
  batchSize?: number
  batchInterval?: number
  enableBatch?: boolean
  pluginSettings?: SDKPluginSettings
  [key: string]: unknown
}

export const DEFAULT_CONFIG: Required<
  Pick<
    SDKConfig,
    'enabled' | 'debug' | 'batchSize' | 'batchInterval' | 'enableBatch'
  >
> = {
  enabled: true,
  debug: false,
  batchSize: 50,
  batchInterval: 10000,
  enableBatch: true,
}
