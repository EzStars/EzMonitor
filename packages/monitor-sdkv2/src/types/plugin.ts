import type { SDKConfig } from './config'

export type PluginStatus
  = | 'registered'
    | 'initialized'
    | 'started'
    | 'stopped'
    | 'destroyed'

export interface IPlugin {
  readonly name: string
  readonly version: string
  status: PluginStatus
  init?: (config: SDKConfig) => Promise<void> | void
  start?: (config: SDKConfig) => Promise<void> | void
  configure?: (pluginConfig: Record<string, unknown>, config: SDKConfig) =>
    Promise<void>
    | void
  stop?: () => Promise<void> | void
  destroy?: () => Promise<void> | void
}
