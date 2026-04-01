import type { SDKConfig } from '../types/config'
import type { IPlugin } from '../types/plugin'
import { DEFAULT_CONFIG } from '../types/config'

export type SDKStatus
  = | 'idle'
    | 'initializing'
    | 'initialized'
    | 'starting'
    | 'started'
    | 'stopping'
    | 'stopped'
    | 'destroying'
    | 'destroyed'

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function createSDK(initialConfig?: Partial<SDKConfig>) {
  let status: SDKStatus = 'idle'
  const sessionId = createSessionId()
  let config: SDKConfig = {
    ...DEFAULT_CONFIG,
    ...initialConfig,
    sessionId,
  }

  const plugins: IPlugin[] = []

  const applyPluginConfig = async (plugin: IPlugin) => {
    const pluginConfig = config.pluginSettings?.[plugin.name]
    if (pluginConfig && plugin.configure) {
      await plugin.configure(pluginConfig, config)
    }
  }

  const sdk = {
    use(plugin: IPlugin, pluginConfig?: Record<string, unknown>) {
      if (status !== 'idle' && status !== 'initialized' && status !== 'stopped') {
        throw new Error(`Cannot register plugin in status: ${status}`)
      }

      if (plugins.some(item => item.name === plugin.name)) {
        throw new Error(`Plugin ${plugin.name} already registered`)
      }

      plugin.status = 'registered'
      plugins.push(plugin)

      if (pluginConfig) {
        config = {
          ...config,
          pluginSettings: {
            ...(config.pluginSettings || {}),
            [plugin.name]: {
              ...(config.pluginSettings?.[plugin.name] || {}),
              ...pluginConfig,
            },
          },
        }
      }

      return sdk
    },

    async init(extraConfig?: Partial<SDKConfig>) {
      if (status !== 'idle') {
        throw new Error(`Cannot init in status: ${status}`)
      }

      status = 'initializing'
      config = {
        ...config,
        ...extraConfig,
        sessionId,
      }

      for (const plugin of plugins) {
        await applyPluginConfig(plugin)
        await plugin.init?.(config)
        plugin.status = 'initialized'
      }

      status = 'initialized'
    },

    async start() {
      if (status !== 'initialized') {
        throw new Error(`Cannot start in status: ${status}`)
      }

      status = 'starting'
      for (const plugin of plugins) {
        await applyPluginConfig(plugin)
        await plugin.start?.(config)
        plugin.status = 'started'
      }
      status = 'started'
    },

    async stop() {
      if (status !== 'started') {
        return
      }

      status = 'stopping'
      for (const plugin of [...plugins].reverse()) {
        await plugin.stop?.()
        plugin.status = 'stopped'
      }
      status = 'stopped'
    },

    async destroy() {
      if (status === 'destroyed' || status === 'destroying') {
        return
      }

      const previousStatus = status
      status = 'destroying'
      if (previousStatus === 'started') {
        await sdk.stop()
      }

      for (const plugin of [...plugins].reverse()) {
        await plugin.destroy?.()
        plugin.status = 'destroyed'
      }

      status = 'destroyed'
    },

    getConfig() {
      return config
    },

    getStatus() {
      return status
    },

    getSessionId() {
      return sessionId
    },
  }

  return sdk
}
