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
  readonly events: TypedEventBus<AllEvents>
  readonly reporter: ReporterFacade
  readonly logger: LoggerFacade
}

export function createPluginContext(args: {
  config: SDKConfig
  eventBus: import('./EventBus').EventBus
}): PluginContext {
  const { config, eventBus } = args
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
    debug: (...a) => config.debug && console.debug('[Plugin]', ...a),
    info: (...a) => console.info('[Plugin]', ...a),
    warn: (...a) => console.warn('[Plugin]', ...a),
    error: (...a) => console.error('[Plugin]', ...a),
  }

  return {
    config,
    events,
    reporter,
    logger,
  }
}
