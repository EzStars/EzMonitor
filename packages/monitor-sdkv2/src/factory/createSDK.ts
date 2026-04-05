import type { ReporterLike } from '../reporting/types'
import type { SDKConfig } from '../types/config'
import type { IPlugin } from '../types/plugin'
import { Reporter } from '../reporting/Reporter'
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
  const reporter = new Reporter(() => config)

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
      //  如果插件实现了 setReporter 方法，则注入 reporter 实例
      plugin.setReporter?.(reporter)
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

      await reporter.prepare()

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
      await reporter.start()
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
      await reporter.stop()
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

      await reporter.destroy()

      status = 'destroyed'
    },

    report(type: string, payload: unknown) {
      reporter.report(type, payload)
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

    getReporter() {
      return reporter as ReporterLike
    },
  }

  return sdk
}
