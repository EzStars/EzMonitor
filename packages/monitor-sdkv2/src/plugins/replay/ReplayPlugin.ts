import type { ReporterLike } from '../../reporting/types'
import type { SDKConfig } from '../../types/config'
import type { IPlugin, PluginStatus } from '../../types/plugin'
import type {
  ReplayErrorContext,
  ReplayEventRecord,
  ReplayPluginConfig,
  ReplaySegmentContext,
} from './types'
import { setReplayErrorContextProvider, setReplayErrorFlusher } from './bridge'

const DEFAULT_CONFIG: Required<ReplayPluginConfig> = {
  sampleRate: 1,
  flushIntervalMs: 15000,
  maxEvents: 200,
  replayBufferMs: 2 * 60 * 1000,
  captureClick: true,
  captureInput: false,
  captureScroll: true,
  captureRoute: true,
  captureVisibility: true,
  captureSnapshot: true,
  snapshotOnStart: true,
  snapshotOnRoute: true,
  snapshotMaxLength: 20000,
  flushOnErrorHint: true,
  blockSelectors: ['[data-monitor-ignore]'],
  maskSelectors: ['[data-monitor-mask]', '[data-sensitive]'],
  redactPatterns: ['token', 'authorization', 'cookie', 'password'],
  redactReplacement: '[REDACTED]',
}

type Listener = () => void

interface RouteAwareWindow extends Window {
  __EZ_MONITOR_REPLAY_HISTORY_PATCHED__?: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeJsonSizeKB(payload: unknown): number {
  try {
    return JSON.stringify(payload).length / 1024
  }
  catch {
    return 0
  }
}

function createSegmentId(): string {
  return `replay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export class ReplayPlugin implements IPlugin {
  readonly name = 'replay'
  readonly version = '1.0.0'
  status: PluginStatus = 'registered'

  private config: SDKConfig = {}
  private reporter?: ReporterLike
  private pluginConfig = { ...DEFAULT_CONFIG }
  private sampled = true
  private startedAt = 0
  private segmentId = createSegmentId()
  private events: ReplayEventRecord[] = []
  private removeListeners: Listener[] = []
  private flushTimer: ReturnType<typeof setInterval> | undefined

  constructor(config: Partial<ReplayPluginConfig> = {}) {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...config,
    }
  }

  configure(pluginConfig: Record<string, unknown>, _sdkConfig: SDKConfig): void {
    void _sdkConfig
    this.pluginConfig = {
      ...this.pluginConfig,
      ...(pluginConfig as Partial<ReplayPluginConfig>),
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

    if (this.config.enabled === false || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    this.sampled = this.shouldSample()
    if (!this.sampled) {
      return
    }

    this.startedAt = Date.now()
    this.segmentId = createSegmentId()

    this.setupErrorBridge()
    this.setupCollectionListeners()
    this.startFlushTimer()

    if (this.pluginConfig.captureSnapshot && this.pluginConfig.snapshotOnStart) {
      this.captureSnapshot('start')
    }
  }

  stop(): void {
    this.flushSegment('stop')
    this.cleanup()
    this.status = 'stopped'
  }

  destroy(): void {
    this.flushSegment('destroy')
    this.cleanup()
    this.status = 'destroyed'
  }

  flushForError(reason = 'error'): void {
    if (!this.pluginConfig.flushOnErrorHint) {
      return
    }

    this.flushSegment(reason)
  }

  private setupErrorBridge(): void {
    setReplayErrorContextProvider(() => this.getErrorContext())
    this.removeListeners.push(() => setReplayErrorContextProvider(undefined))

    setReplayErrorFlusher((reason) => {
      this.flushSegment(reason ?? 'error')
    })
    this.removeListeners.push(() => setReplayErrorFlusher(undefined))
  }

  private setupCollectionListeners(): void {
    if (this.pluginConfig.captureClick) {
      const clickHandler = (event: MouseEvent) => {
        const target = event.target as Element | null
        if (this.shouldBlock(target)) {
          return
        }

        this.record('click', {
          x: event.clientX,
          y: event.clientY,
          target: this.describeElement(target),
        })
      }

      window.addEventListener('click', clickHandler, true)
      this.removeListeners.push(() => window.removeEventListener('click', clickHandler, true))
    }

    if (this.pluginConfig.captureInput) {
      const inputHandler = (event: Event) => {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
        if (!target || this.shouldBlock(target)) {
          return
        }

        const value = target.value ?? ''
        const isMasked = this.shouldMask(target)
        this.record('input', {
          target: this.describeElement(target),
          inputType: target.type || target.tagName.toLowerCase(),
          value: isMasked ? '[MASKED]' : this.redactText(value),
          valueLength: value.length,
        })
      }

      window.addEventListener('input', inputHandler, true)
      this.removeListeners.push(() => window.removeEventListener('input', inputHandler, true))
    }

    if (this.pluginConfig.captureScroll) {
      let lastScrollAt = 0
      const scrollHandler = () => {
        const now = Date.now()
        if (now - lastScrollAt < 500) {
          return
        }

        lastScrollAt = now
        this.record('scroll', {
          x: window.scrollX,
          y: window.scrollY,
        })
      }

      window.addEventListener('scroll', scrollHandler, true)
      this.removeListeners.push(() => window.removeEventListener('scroll', scrollHandler, true))
    }

    if (this.pluginConfig.captureRoute) {
      const routeHandler = () => {
        this.record('route', {
          route: this.currentRoute(),
        })

        if (this.pluginConfig.captureSnapshot && this.pluginConfig.snapshotOnRoute) {
          this.captureSnapshot('route')
        }
      }

      window.addEventListener('popstate', routeHandler, true)
      window.addEventListener('hashchange', routeHandler, true)
      window.addEventListener('ez-monitor:route-change', routeHandler, true)

      this.patchHistory()

      this.removeListeners.push(() => window.removeEventListener('popstate', routeHandler, true))
      this.removeListeners.push(() => window.removeEventListener('hashchange', routeHandler, true))
      this.removeListeners.push(() => window.removeEventListener('ez-monitor:route-change', routeHandler, true))
    }

    if (this.pluginConfig.captureVisibility) {
      const visibilityHandler = () => {
        this.record('visibility', {
          state: document.visibilityState,
        })

        if (document.visibilityState === 'hidden') {
          this.flushSegment('hidden')
          void this.reporter?.flush()
        }
      }

      document.addEventListener('visibilitychange', visibilityHandler, true)
      this.removeListeners.push(() => document.removeEventListener('visibilitychange', visibilityHandler, true))
    }

    const pageHideHandler = () => {
      this.flushSegment('pagehide')
      void this.reporter?.flush()
    }

    window.addEventListener('pagehide', pageHideHandler, true)
    this.removeListeners.push(() => window.removeEventListener('pagehide', pageHideHandler, true))
  }

  private startFlushTimer(): void {
    if (this.flushTimer || this.pluginConfig.flushIntervalMs <= 0) {
      return
    }

    this.flushTimer = setInterval(() => {
      this.flushSegment('interval')
    }, this.pluginConfig.flushIntervalMs)
  }

  private patchHistory(): void {
    const replayWindow = window as RouteAwareWindow
    if (replayWindow.__EZ_MONITOR_REPLAY_HISTORY_PATCHED__) {
      return
    }

    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)

    const wrap = (original: typeof window.history.pushState) => {
      return (...args: Parameters<typeof window.history.pushState>) => {
        const result = original.apply(window.history, args)
        window.dispatchEvent(new Event('ez-monitor:route-change'))
        return result
      }
    }

    window.history.pushState = wrap(originalPushState)
    window.history.replaceState = wrap(originalReplaceState)
    replayWindow.__EZ_MONITOR_REPLAY_HISTORY_PATCHED__ = true

    this.removeListeners.push(() => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      replayWindow.__EZ_MONITOR_REPLAY_HISTORY_PATCHED__ = false
    })
  }

  private captureSnapshot(reason: string): void {
    if (typeof document === 'undefined') {
      return
    }

    const html = document.documentElement?.outerHTML
    if (!html) {
      return
    }

    const masked = this.redactText(html).slice(0, this.pluginConfig.snapshotMaxLength)
    this.record('dom_snapshot', {
      reason,
      html: masked,
      title: document.title,
      route: this.currentRoute(),
    })
  }

  private record(type: ReplayEventRecord['type'], data: Record<string, unknown>): void {
    if (!this.sampled || this.config.enabled === false) {
      return
    }

    const now = Date.now()
    const sanitizedData = this.sanitizeData(data)

    this.events.push({
      type,
      at: now,
      data: sanitizedData,
    })

    this.trimEvents(now)
  }

  private trimEvents(now: number): void {
    const keepSince = now - this.pluginConfig.replayBufferMs
    while (this.events.length > 0 && this.events[0].at < keepSince) {
      this.events.shift()
    }

    while (this.events.length > this.pluginConfig.maxEvents) {
      this.events.shift()
    }
  }

  private flushSegment(reason: string): ReplaySegmentContext | undefined {
    if (!this.sampled || !this.reporter || this.events.length === 0) {
      return undefined
    }

    const segment = this.buildSegmentContext()
    const payload = {
      appId: this.config.appId,
      context: {
        page: this.currentRoute(),
        replay: {
          segmentId: segment.segmentId,
          eventCount: segment.eventCount,
        },
      },
      endedAt: segment.endedAt,
      eventCount: segment.eventCount,
      reason,
      route: segment.route,
      sample: segment.sample,
      segmentId: segment.segmentId,
      startedAt: segment.startedAt,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.userId,
    }

    if (safeJsonSizeKB(payload) <= 120) {
      this.reporter.report('replay', payload)
    }
    else {
      this.reporter.report('replay', {
        ...payload,
        sample: segment.sample.slice(-10),
        truncated: true,
      })
    }

    this.segmentId = createSegmentId()
    this.startedAt = Date.now()
    this.events = []

    return segment
  }

  private getErrorContext(): ReplayErrorContext | undefined {
    if (!this.sampled || this.events.length === 0) {
      return undefined
    }

    const tail = this.events.slice(-20)
    const last = tail[tail.length - 1]

    return {
      segmentId: this.segmentId,
      lastEventAt: last.at,
      eventCount: this.events.length,
      route: this.currentRoute(),
      sample: tail,
    }
  }

  private buildSegmentContext(): ReplaySegmentContext {
    const tail = this.events.slice(-40)
    const startedAt = this.events[0]?.at ?? Date.now()
    const endedAt = this.events[this.events.length - 1]?.at ?? startedAt

    return {
      segmentId: this.segmentId,
      startedAt,
      endedAt,
      eventCount: this.events.length,
      route: this.currentRoute(),
      sample: tail,
    }
  }

  private currentRoute(): string {
    if (typeof window === 'undefined') {
      return ''
    }

    return `${window.location.pathname}${window.location.search}${window.location.hash}`
  }

  private shouldSample(): boolean {
    const rate = Math.max(0, Math.min(1, this.pluginConfig.sampleRate))
    if (rate >= 1) {
      return true
    }

    return Math.random() <= rate
  }

  private shouldBlock(target: Element | null): boolean {
    if (!target) {
      return false
    }

    return this.pluginConfig.blockSelectors.some((selector) => {
      try {
        return target.matches(selector) || !!target.closest(selector)
      }
      catch {
        return false
      }
    })
  }

  private shouldMask(target: Element | null): boolean {
    if (!target) {
      return false
    }

    const input = target as HTMLInputElement
    if (typeof input.type === 'string' && input.type.toLowerCase() === 'password') {
      return true
    }

    return this.pluginConfig.maskSelectors.some((selector) => {
      try {
        return target.matches(selector) || !!target.closest(selector)
      }
      catch {
        return false
      }
    })
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        next[key] = this.redactText(value)
        continue
      }

      if (Array.isArray(value)) {
        next[key] = value.map(item => (typeof item === 'string' ? this.redactText(item) : item))
        continue
      }

      if (isObject(value)) {
        next[key] = this.sanitizeData(value)
        continue
      }

      next[key] = value
    }

    return next
  }

  private redactText(value: string): string {
    let result = value
    for (const pattern of this.pluginConfig.redactPatterns) {
      try {
        if (typeof pattern === 'string' && pattern.trim() !== '') {
          result = result.replace(new RegExp(pattern, 'gi'), this.pluginConfig.redactReplacement)
          continue
        }

        result = result.replace(pattern, this.pluginConfig.redactReplacement)
      }
      catch {
        // Ignore invalid regex.
      }
    }

    return result
  }

  private describeElement(target: Element | null): string | undefined {
    if (!target) {
      return undefined
    }

    const id = target.id ? `#${target.id}` : ''
    const className = typeof target.className === 'string' && target.className.trim()
      ? `.${target.className.trim().split(/\s+/).join('.')}`
      : ''

    return `${target.tagName.toLowerCase()}${id}${className}`
  }

  private cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    for (const remove of this.removeListeners.splice(0)) {
      remove()
    }

    this.events = []
    this.startedAt = 0
    this.segmentId = createSegmentId()
    this.sampled = true
    setReplayErrorContextProvider(undefined)
  }
}
