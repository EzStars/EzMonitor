import type { ReporterLike } from '../../reporting/types'
import type { SDKConfig } from '../../types/config'
import type { IPlugin, PluginStatus } from '../../types/plugin'
import type { ErrorFrame, ErrorPluginConfig, ErrorPluginPayload } from './types'
import { flushReplayOnError, getReplayErrorContext } from '../replay/bridge'

const DEFAULT_CONFIG: Required<Omit<ErrorPluginConfig, 'eventFilter'>> & {
  eventFilter: NonNullable<ErrorPluginConfig['eventFilter']>
} = {
  captureJsError: true,
  captureUnhandledRejection: true,
  captureResourceError: true,
  captureConsoleError: false,
  attachReplayContext: true,
  sampleRate: 1,
  dedupeWindowMs: 5000,
  flushOnError: true,
  maxStackFrames: 20,
  eventFilter: () => true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return typeof error.stack === 'string' ? error.stack : undefined
  }

  if (isRecord(error) && typeof error.stack === 'string') {
    return error.stack
  }

  return undefined
}

function toMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message
  }

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message
  }

  if (typeof error === 'string' && error.trim() !== '') {
    return error
  }

  try {
    const serialized = JSON.stringify(error)
    if (serialized && serialized !== '{}') {
      return serialized
    }
  }
  catch {
    // Ignore serialization errors and fall back.
  }

  return fallback
}

function getWindowUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.location.href
}

function getUserAgent(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return navigator.userAgent
}

function parseStackFrames(stack: string | undefined, maxFrames: number): ErrorFrame[] {
  if (!stack) {
    return []
  }

  const lines = stack.split('\n').map(line => line.trim()).filter(Boolean)
  const frames: ErrorFrame[] = []

  for (const line of lines) {
    if (frames.length >= maxFrames) {
      break
    }

    const normalized = line.startsWith('at ') ? line.slice(3).trim() : line
    let functionName: string | undefined
    let locationPart = normalized

    if (normalized.endsWith(')') && normalized.includes(' (')) {
      const separator = normalized.lastIndexOf(' (')
      functionName = normalized.slice(0, separator).trim()
      locationPart = normalized.slice(separator + 2, -1).trim()
    }

    const lastColon = locationPart.lastIndexOf(':')
    const secondLastColon = lastColon > 0 ? locationPart.lastIndexOf(':', lastColon - 1) : -1

    if (lastColon <= 0 || secondLastColon <= 0) {
      frames.push({ raw: line })
      continue
    }

    const file = locationPart.slice(0, secondLastColon)
    const lineNumber = Number(locationPart.slice(secondLastColon + 1, lastColon))
    const columnNumber = Number(locationPart.slice(lastColon + 1))

    frames.push({
      functionName,
      file,
      line: Number.isFinite(lineNumber) ? lineNumber : undefined,
      column: Number.isFinite(columnNumber) ? columnNumber : undefined,
      raw: line,
    })
  }

  return frames
}

function createFingerprint(type: string, message: string, stack: string | undefined, url: string | undefined): string {
  const firstStackLine = stack?.split('\n')[1]?.trim() ?? stack?.split('\n')[0]?.trim() ?? ''
  return [type, message, firstStackLine, url ?? ''].join('|').toLowerCase()
}

export class ErrorPlugin implements IPlugin {
  readonly name = 'error'
  readonly version = '1.0.0'
  status: PluginStatus = 'registered'

  private config: SDKConfig = {}
  private reporter?: ReporterLike
  private pluginConfig = { ...DEFAULT_CONFIG }
  private removeListeners: Array<() => void> = []
  private dedupeMap = new Map<string, number>()
  private isInternalReporting = false

  constructor(config: Partial<ErrorPluginConfig> = {}) {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...config,
    }
  }

  configure(pluginConfig: Record<string, unknown>, _sdkConfig: SDKConfig): void {
    void _sdkConfig
    this.pluginConfig = {
      ...this.pluginConfig,
      ...(pluginConfig as Partial<ErrorPluginConfig>),
    }
  }

  setReporter(reporter: ReporterLike): void {
    this.reporter = reporter
  }

  init(config: SDKConfig): void {
    this.config = config
    this.status = 'initialized'
  }

  start(config: SDKConfig): void {
    this.config = config
    this.status = 'started'

    if (this.config.enabled === false || typeof window === 'undefined') {
      return
    }

    if (this.pluginConfig.captureJsError) {
      this.setupJsErrorListener()
    }

    if (this.pluginConfig.captureUnhandledRejection) {
      this.setupUnhandledRejectionListener()
    }

    if (this.pluginConfig.captureResourceError) {
      this.setupResourceErrorListener()
    }

    if (this.pluginConfig.captureConsoleError) {
      this.setupConsoleErrorPatch()
    }
  }

  stop(): void {
    this.cleanup()
    this.status = 'stopped'
  }

  destroy(): void {
    this.cleanup()
    this.dedupeMap.clear()
    this.status = 'destroyed'
  }

  private setupJsErrorListener(): void {
    const handler = (event: ErrorEvent) => {
      this.reportError('error_js', {
        message: event.message || 'JavaScript runtime error',
        stack: event.error instanceof Error ? event.error.stack : undefined,
        url: event.filename || getWindowUrl(),
        detail: {
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    }

    window.addEventListener('error', handler)
    this.removeListeners.push(() => window.removeEventListener('error', handler))
  }

  private setupUnhandledRejectionListener(): void {
    const handler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      this.reportError('error_promise', {
        message: toMessage(reason, 'Unhandled Promise Rejection'),
        stack: toStack(reason),
        url: getWindowUrl(),
      })
    }

    window.addEventListener('unhandledrejection', handler)
    this.removeListeners.push(() => window.removeEventListener('unhandledrejection', handler))
  }

  private setupResourceErrorListener(): void {
    const handler = (event: Event) => {
      const target = event.target as (HTMLElement & {
        src?: string
        href?: string
        outerHTML?: string
      }) | null

      if (!target) {
        return
      }

      const tagName = target.tagName?.toLowerCase() || 'resource'
      const src = target.src || target.href
      this.reportError('error_resource', {
        message: `${tagName} load failed`,
        url: src || getWindowUrl(),
        detail: {
          tagName,
          src,
        },
      })
    }

    window.addEventListener('error', handler, true)
    this.removeListeners.push(() => window.removeEventListener('error', handler, true))
  }

  private setupConsoleErrorPatch(): void {
    if (typeof console === 'undefined' || typeof console.error !== 'function') {
      return
    }

    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args)

      if (this.isInternalReporting) {
        return
      }

      const [firstArg] = args
      this.reportError('error_console', {
        message: toMessage(firstArg, 'console.error called'),
        stack: toStack(firstArg),
        url: getWindowUrl(),
        detail: {
          args,
        },
      })
    }

    this.removeListeners.push(() => {
      console.error = originalConsoleError
    })
  }

  private cleanup(): void {
    for (const remove of this.removeListeners.splice(0)) {
      remove()
    }
  }

  private shouldSample(): boolean {
    const rate = Math.max(0, Math.min(1, this.pluginConfig.sampleRate))
    if (rate >= 1) {
      return true
    }

    return Math.random() <= rate
  }

  private isDuplicated(fingerprint: string): boolean {
    const now = Date.now()
    const previous = this.dedupeMap.get(fingerprint)
    if (typeof previous === 'number' && now - previous < this.pluginConfig.dedupeWindowMs) {
      return true
    }

    this.dedupeMap.set(fingerprint, now)
    return false
  }

  private createPayload(
    type: string,
    data: {
      message: string
      stack?: string
      url?: string
      detail?: Record<string, unknown>
    },
  ): ErrorPluginPayload {
    const maxFrames = Math.max(1, this.pluginConfig.maxStackFrames)
    const frames = parseStackFrames(data.stack, maxFrames)
    const fingerprint = createFingerprint(type, data.message, data.stack, data.url)

    const payload: ErrorPluginPayload = {
      type,
      message: data.message,
      stack: data.stack,
      url: data.url,
      userAgent: getUserAgent(),
      timestamp: Date.now(),
      appId: this.config.appId as string | undefined,
      appVersion: this.config.appVersion as string | undefined,
      release: (this.config.release as string | undefined) ?? (this.config.appVersion as string | undefined),
      environment: this.config.environment as string | undefined,
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      fingerprint,
      frames: frames.length > 0 ? frames : undefined,
      detail: data.detail,
    }

    if (this.pluginConfig.attachReplayContext) {
      const replayContext = getReplayErrorContext()
      if (replayContext) {
        payload.detail = {
          ...(payload.detail ?? {}),
          replay: replayContext,
        }
      }
    }

    return payload
  }

  private reportError(
    type: string,
    data: {
      message: string
      stack?: string
      url?: string
      detail?: Record<string, unknown>
    },
  ): void {
    if (!this.config.enabled || !this.reporter) {
      return
    }

    if (!this.shouldSample()) {
      return
    }

    const payload = this.createPayload(type, data)
    if (this.isDuplicated(payload.fingerprint)) {
      return
    }

    if (!this.pluginConfig.eventFilter(payload)) {
      return
    }

    flushReplayOnError(type)

    try {
      this.isInternalReporting = true
      this.reporter.report(type, payload)
      if (this.pluginConfig.flushOnError) {
        void this.reporter.flush()
      }
    }
    catch (error) {
      if (this.config.debug) {
        console.warn('[ErrorPlugin] report failed', error)
      }
    }
    finally {
      this.isInternalReporting = false
    }
  }
}
