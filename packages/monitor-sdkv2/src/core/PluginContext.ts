import type { SDKConfig } from '../types/config'
import type { AllEvents } from '../types/events'
import { INTERNAL_EVENTS } from '../types/events'
import { TypedEventBus } from './TypedEventBus'

export interface ReporterFacade {
  report: (type: string, data: unknown) => void
  reportBatch: (items: unknown[]) => void
}

export interface LoggerFacade {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

export interface PluginContext {
  readonly config: Readonly<SDKConfig>
  getConfig: () => Readonly<SDKConfig>
  getPluginConfig: <T = Record<string, unknown>>(
    pluginName: string,
  ) => T | undefined
  readonly events: TypedEventBus<AllEvents>
  readonly reporter: ReporterFacade
  readonly logger: LoggerFacade
}

export function createPluginContext(args: {
  getConfig: () => SDKConfig
  getPluginConfig?: (
    pluginName: string,
  ) => Record<string, unknown> | undefined
  eventBus: import('./EventBus').EventBus
}): PluginContext {
  const { getConfig, getPluginConfig, eventBus } = args
  const events = new TypedEventBus<AllEvents>(eventBus)

  const reporter: ReporterFacade = {
    report: (type, data) => {
      events.emit(INTERNAL_EVENTS.REPORT_DATA, { type, data })
    },
    reportBatch: (items) => {
      events.emit(INTERNAL_EVENTS.REPORT_BATCH, { items })
    },
  }

  const logger: LoggerFacade = {
    debug: (...a) => getConfig().debug && console.warn('[Plugin:debug]', ...a),
    info: (...a) => console.warn('[Plugin:info]', ...a),
    warn: (...a) => console.warn('[Plugin]', ...a),
    error: (...a) => console.error('[Plugin]', ...a),
  }

  const context: PluginContext = {
    get config() {
      return getConfig()
    },
    getConfig,
    getPluginConfig: <T = Record<string, unknown>>(pluginName: string) =>
      getPluginConfig?.(pluginName) as T | undefined,
    events,
    reporter,
    logger,
  }

  return context
}
