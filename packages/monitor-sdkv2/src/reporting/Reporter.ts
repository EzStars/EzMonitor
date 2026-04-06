import type { SDKConfig } from '../types/config'
import type {
  ITransportAdapter,
  ReportEnvelope,
  ReporterLike,
  ReporterOptions,
  StorageLike,
} from './types'
import { createDefaultTransports } from './transports'

interface PersistedQueue {
  savedAt: number
  items: ReportEnvelope[]
}

const DEFAULT_BATCH_SIZE = 1
const MAX_BEACON_SIZE_KB = 64
const MAX_IMAGE_SIZE_KB = 2

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getPayloadSizeKB(body: string): number {
  if (typeof Blob !== 'undefined') {
    return new Blob([body]).size / 1024
  }

  return body.length / 1024
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0 || value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}...`
}

function redacts(value: string, patterns: Array<string | RegExp>, replacement: string): string {
  let result = value
  for (const pattern of patterns) {
    try {
      if (typeof pattern === 'string' && pattern.trim() !== '') {
        result = result.split(pattern).join(replacement)
        continue
      }

      if (pattern instanceof RegExp) {
        result = result.replace(pattern, replacement)
      }
    }
    catch {
      // Ignore broken pattern.
    }
  }

  return result
}

function sanitizeRecord(
  payload: Record<string, unknown>,
  patterns: Array<string | RegExp>,
  replacement: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      result[key] = redacts(value, patterns, replacement)
      continue
    }

    if (Array.isArray(value)) {
      result[key] = value.map((entry) => {
        if (typeof entry === 'string') {
          return redacts(entry, patterns, replacement)
        }

        if (isRecord(entry)) {
          return sanitizeRecord(entry, patterns, replacement)
        }

        return entry
      })
      continue
    }

    if (isRecord(value)) {
      result[key] = sanitizeRecord(value, patterns, replacement)
      continue
    }

    result[key] = value
  }

  return result
}

function omitKeys(
  value: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!keys.includes(key)) {
      result[key] = entry
    }
  }
  return result
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function getStorage(): StorageLike | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined
  }

  return localStorage
}

function getIdleScheduler():
  | {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }
  | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }
}

export class Reporter implements ReporterLike {
  private queue: ReportEnvelope[] = []
  private started = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private flushPromise: Promise<void> | null = null
  private restored = false
  private readonly transports: ITransportAdapter[]
  private readonly storage: StorageLike | undefined
  private readonly now: () => number

  constructor(
    private readonly getConfig: () => SDKConfig,
    options: ReporterOptions = {},
  ) {
    this.transports = options.transports ?? createDefaultTransports()
    this.storage = options.storage ?? getStorage()
    this.now = options.now ?? Date.now
  }

  async prepare(): Promise<void> {
    this.restoreFromStorage()
  }

  async start(): Promise<void> {
    await this.prepare()
    this.started = true
    this.scheduleFlush()
    await this.flush()
  }

  async stop(): Promise<void> {
    await this.flush()
    this.started = false
    this.clearScheduledFlush()
  }

  async destroy(): Promise<void> {
    await this.stop()
    this.queue = []
    this.clearStorage()
  }

  report(type: string, payload: unknown): void {
    const config = this.getConfig()
    if (config.enabled === false) {
      return
    }

    const envelope: ReportEnvelope = {
      type,
      payload,
      timestamp: this.now(),
      sessionId: config.sessionId,
      appId: config.appId,
      userId: config.userId,
    }

    this.queue.push(envelope)
    this.persistQueue()

    if (!this.started) {
      return
    }

    if (!config.enableBatch || this.queue.length >= this.getBatchSize()) {
      void this.flush()
      return
    }

    this.scheduleFlush()
  }

  async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise
    }

    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null
    })

    return this.flushPromise
  }

  private async flushInternal(): Promise<void> {
    if (!this.queue.length) {
      return
    }

    const config = this.getConfig()
    const reportUrl = config.reportUrl?.trim()

    if (!reportUrl) {
      if (config.debug) {
        console.warn('[Reporter] reportUrl is missing, queue is kept in memory')
      }
      return
    }

    const pending = this.queue.splice(0)
    const batches = chunk(pending, this.getBatchSize())

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]
      const success = await this.sendWithRetry(reportUrl, batch)
      if (!success) {
        const remaining = batches.slice(index).flat()
        this.queue = [...remaining, ...this.queue]
        this.persistQueue()
        return
      }
    }

    this.clearStorage()
  }

  private async sendWithRetry(reportUrl: string, batch: ReportEnvelope[]): Promise<boolean> {
    const config = this.getConfig()
    const maxRetryCount = config.enableRetry === false ? 1 : Math.max(1, config.maxRetryCount ?? 1)
    const retryDelay = Math.max(0, config.retryDelay ?? 0)

    for (let attempt = 1; attempt <= maxRetryCount; attempt += 1) {
      try {
        await this.sendBatch(reportUrl, batch)
        return true
      }
      catch (error) {
        if (attempt >= maxRetryCount) {
          if (config.debug) {
            console.warn('[Reporter] failed to send batch', error)
          }
          return false
        }

        if (retryDelay > 0) {
          await delay(retryDelay * attempt)
        }
      }
    }

    return false
  }

  private async sendBatch(reportUrl: string, batch: ReportEnvelope[]): Promise<void> {
    const body = JSON.stringify({
      appId: this.getConfig().appId,
      items: batch.map(envelope => this.serializeBatchItem(envelope)),
      sessionId: this.getConfig().sessionId,
      userId: this.getConfig().userId,
    })

    const transport = this.selectTransport(body)
    if (!transport) {
      throw new Error('No supported transport adapter found')
    }

    await transport.send(reportUrl, body)
  }

  private serializeBatchItem(envelope: ReportEnvelope): Record<string, unknown> {
    const payload = this.applySecurityHooks(envelope.type, getRecord(envelope.payload) ?? {})
    const appId = getString(payload.appId) ?? envelope.appId ?? ''
    const timestamp = getNumber(payload.timestamp) ?? envelope.timestamp

    if (envelope.type === 'tracking:page') {
      const page = getString(payload.page)
      const properties = {
        ...(getRecord(payload.properties) ?? {}),
        ...(page ? { page } : {}),
      }
      const context = {
        ...(getRecord(payload.context) ?? {}),
        ...(page ? { page } : {}),
      }

      return {
        type: 'tracking',
        appId,
        timestamp,
        eventName: 'page_view',
        properties,
        context,
        userId: getString(payload.userId) ?? envelope.userId,
      }
    }

    if (envelope.type === 'tracking:user') {
      const userId = getString(payload.userId) ?? envelope.userId
      const properties = {
        ...(getRecord(payload.properties) ?? {}),
        ...(userId ? { userId } : {}),
      }
      const context = {
        ...(getRecord(payload.context) ?? {}),
        ...(userId ? { userId } : {}),
      }

      return {
        type: 'tracking',
        appId,
        timestamp,
        eventName: 'user_identify',
        properties,
        context,
        userId,
      }
    }

    if (envelope.type.startsWith('performance_')) {
      const metrics = getRecord(payload.metrics)
      const extra = getRecord(payload.extra)
        ?? omitKeys(payload, ['appId', 'timestamp', 'sessionId', 'userId', 'eventName', 'metrics', 'extra', 'page'])
      const value
        = getNumber(payload.value)
          ?? getNumber(payload.duration)
          ?? getNumber(metrics?.duration)
          ?? getNumber(metrics?.load)
          ?? getNumber(metrics?.responseStart)
          ?? getNumber(metrics?.simulatedCost)
          ?? 0

      return {
        type: 'performance',
        appId,
        timestamp,
        metricType: envelope.type,
        value,
        url: getString(payload.url) ?? getString(payload.page),
        extra,
        context: getRecord(payload.context),
      }
    }

    if (envelope.type.startsWith('error_')) {
      const detail = getRecord(payload.detail)
      const release = getString(payload.release) ?? getString(payload.appVersion)
      const maxFrames = Math.max(1, this.getConfig().security?.maxErrorStackFrames ?? 20)
      const rawFrames = Array.isArray(payload.frames) ? payload.frames.slice(0, maxFrames) : undefined
      const maxMessageLength = Math.max(64, this.getConfig().security?.maxErrorMessageLength ?? 2000)
      const message = truncate(getString(payload.message) ?? envelope.type, maxMessageLength)

      return {
        type: 'error',
        appId,
        timestamp,
        errorType: getString(payload.type) ?? envelope.type,
        message,
        stack: getString(payload.stack),
        url: getString(payload.url) ?? getString(payload.page) ?? getString(detail?.href) ?? getString(detail?.src),
        userAgent: getString(payload.userAgent),
        sessionId: getString(payload.sessionId) ?? envelope.sessionId,
        userId: getString(payload.userId) ?? envelope.userId,
        release,
        environment: getString(payload.environment),
        appVersion: getString(payload.appVersion),
        fingerprint: getString(payload.fingerprint),
        traceId: getString(payload.traceId),
        frames: rawFrames,
        detail,
      }
    }

    const eventName
      = getString(payload.eventName)
        ?? (envelope.type === 'tracking:event' ? 'tracking_event' : envelope.type)

    return {
      type: 'tracking',
      appId,
      timestamp,
      eventName,
      properties: getRecord(payload.properties) ?? omitKeys(payload, ['appId', 'timestamp', 'sessionId', 'userId', 'eventName', 'properties', 'context']),
      context: getRecord(payload.context),
      userId: getString(payload.userId) ?? envelope.userId,
    }
  }

  private selectTransport(body: string): ITransportAdapter | undefined {
    const supportedTransports = this.transports.filter(transport => transport.isSupported())
    if (!supportedTransports.length) {
      return undefined
    }

    const config = this.getConfig()
    if (config.forceXHR) {
      return supportedTransports.find(transport => transport.type === 'xhr') ?? supportedTransports[0]
    }

    const payloadSizeKB = getPayloadSizeKB(body)
    if (payloadSizeKB <= MAX_IMAGE_SIZE_KB) {
      return supportedTransports.find(transport => transport.type === 'beacon')
        ?? supportedTransports.find(transport => transport.type === 'xhr')
        ?? supportedTransports.find(transport => transport.type === 'image')
        ?? supportedTransports[0]
    }

    if (payloadSizeKB <= MAX_BEACON_SIZE_KB) {
      return supportedTransports.find(transport => transport.type === 'beacon')
        ?? supportedTransports.find(transport => transport.type === 'xhr')
        ?? supportedTransports.find(transport => transport.type === 'image')
        ?? supportedTransports[0]
    }

    return supportedTransports.find(transport => transport.type === 'xhr')
      ?? supportedTransports.find(transport => transport.type === 'beacon')
      ?? supportedTransports.find(transport => transport.type === 'image')
      ?? supportedTransports[0]
  }

  private getBatchSize(): number {
    const batchSize = this.getConfig().batchSize ?? DEFAULT_BATCH_SIZE
    return Math.max(1, batchSize)
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || !this.started) {
      return
    }

    const timeout = Math.max(0, this.getConfig().batchInterval ?? 0)
    const idleScheduler = getIdleScheduler()

    if (idleScheduler?.requestIdleCallback) {
      this.flushTimer = idleScheduler.requestIdleCallback(() => {
        this.flushTimer = null
        void this.flush()
      }, { timeout }) as unknown as ReturnType<typeof setTimeout>
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this.flush()
    }, timeout)
  }

  private clearScheduledFlush(): void {
    if (this.flushTimer === null) {
      return
    }

    const idleScheduler = getIdleScheduler()
    if (idleScheduler?.cancelIdleCallback && typeof this.flushTimer === 'number') {
      idleScheduler.cancelIdleCallback(this.flushTimer)
    }
    else {
      clearTimeout(this.flushTimer)
    }

    this.flushTimer = null
  }

  private getStorageKey(): string | undefined {
    const config = this.getConfig()
    if (config.enableLocalStorage === false) {
      return undefined
    }

    return config.localStorageKey ?? 'ez_monitor_report_queue'
  }

  private persistQueue(): void {
    const storageKey = this.getStorageKey()
    if (!storageKey || !this.storage) {
      return
    }

    const payload: PersistedQueue = {
      items: this.queue,
      savedAt: this.now(),
    }

    try {
      this.storage.setItem(storageKey, JSON.stringify(payload))
    }
    catch (error) {
      if (this.getConfig().debug) {
        console.warn('[Reporter] failed to persist queue', error)
      }
    }
  }

  private restoreFromStorage(): void {
    if (this.restored) {
      return
    }

    this.restored = true

    const storageKey = this.getStorageKey()
    if (!storageKey || !this.storage) {
      return
    }

    try {
      const raw = this.storage.getItem(storageKey)
      if (!raw) {
        return
      }

      const restored = JSON.parse(raw) as PersistedQueue
      const expireTime = Math.max(0, this.getConfig().cacheExpireTime ?? 0)
      if (expireTime > 0 && this.now() - restored.savedAt > expireTime) {
        this.storage.removeItem(storageKey)
        return
      }

      if (Array.isArray(restored.items) && restored.items.length > 0) {
        this.queue = [...restored.items, ...this.queue]
      }
    }
    catch (error) {
      if (this.getConfig().debug) {
        console.warn('[Reporter] failed to restore queue', error)
      }
    }
  }

  private clearStorage(): void {
    const storageKey = this.getStorageKey()
    if (!storageKey || !this.storage) {
      return
    }

    try {
      this.storage.removeItem(storageKey)
    }
    catch {
      // Ignore storage cleanup failures.
    }
  }

  private applySecurityHooks(type: string, payload: Record<string, unknown>): Record<string, unknown> {
    const security = this.getConfig().security
    let nextPayload = payload

    if (security?.beforeSend) {
      try {
        const transformed = security.beforeSend(type, payload)
        if (transformed === null) {
          return {}
        }

        if (transformed && isRecord(transformed)) {
          nextPayload = transformed
        }
      }
      catch (error) {
        if (this.getConfig().debug) {
          console.warn('[Reporter] beforeSend hook failed', error)
        }
      }
    }

    const patterns = security?.redactPatterns
    if (!patterns || patterns.length === 0) {
      return nextPayload
    }

    return sanitizeRecord(nextPayload, patterns, security.redactReplacement ?? '[REDACTED]')
  }
}
