import type { ReporterLike } from '../../reporting/types'
import type { SDKConfig } from '../../types/config'
import type { IPlugin, PluginStatus } from '../../types/plugin'
import type {
  TrackingEventData,
  TrackingPageData,
  TrackingPluginConfig,
  TrackingUserData,
  TrackingUVData,
} from './types'

interface UVStorageRecord {
  day: string
  lastReportAt: number
  visitorId: string
}

type HistoryPatchedWindow = Window & {
  __EZ_MONITOR_HISTORY_PATCHED__?: boolean
}

const DEFAULT_VISITOR_KEY = 'ez_monitor_visitor_id'
const DEFAULT_UV_KEY = 'ez_monitor_uv_daily'
const ROUTE_CHANGE_EVENT = 'ez-monitor:route-change'

export class TrackingPlugin implements IPlugin {
  readonly name = 'tracking'
  readonly version = '1.0.0'
  status: PluginStatus = 'registered'

  private config: SDKConfig = {}
  private reporter?: ReporterLike
  private removeListeners: Array<() => void> = []
  private lastTrackedPage = ''
  private lastTrackAt = 0
  private visitorId?: string
  private pluginConfig: Required<TrackingPluginConfig> = {
    autoTrackPage: true,
    autoTrackRoute: true,
    autoTrackUv: true,
    trackHashRoute: true,
    flushOnPageHide: true,
    visitorIdStorageKey: DEFAULT_VISITOR_KEY,
    uvStorageKey: DEFAULT_UV_KEY,
    visitorIdTtlDays: 365,
    eventFilter: () => true,
  }

  constructor(config: Partial<TrackingPluginConfig> = {}) {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...config,
    }
  }

  configure(pluginConfig: Record<string, unknown>, _sdkConfig: SDKConfig): void {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...(pluginConfig as Partial<TrackingPluginConfig>),
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

    this.visitorId = this.ensureVisitorId()

    if (this.pluginConfig.autoTrackPage) {
      this.trackPage(this.getCurrentPage(), {
        routeType: 'initial',
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      })
    }

    if (this.pluginConfig.autoTrackUv) {
      this.trackUvIfNeeded('session_start')
    }

    if (this.pluginConfig.autoTrackRoute) {
      this.setupRouteListeners()
    }

    if (this.pluginConfig.flushOnPageHide && typeof document !== 'undefined') {
      const handlePageHide = () => {
        void this.reporter?.flush()
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          void this.reporter?.flush()
        }
      }

      window.addEventListener('pagehide', handlePageHide, true)
      document.addEventListener('visibilitychange', handleVisibilityChange, true)

      this.removeListeners.push(() => window.removeEventListener('pagehide', handlePageHide, true))
      this.removeListeners.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange, true))
    }
  }

  stop(): void {
    this.cleanup()
    this.status = 'stopped'
  }

  destroy(): void {
    this.cleanup()
    this.status = 'destroyed'
  }

  track(eventName: string, properties?: Record<string, unknown>): TrackingEventData | null {
    if (!this.pluginConfig.eventFilter(eventName, properties)) {
      return null
    }

    const payload: TrackingEventData = {
      eventName,
      properties,
      context: {
        page: this.getCurrentPage(),
        visitorId: this.visitorId,
      },
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:event', payload)
    return payload
  }

  trackPage(page: string, properties?: Record<string, unknown>): TrackingPageData {
    const now = Date.now()
    if (this.lastTrackedPage === page && now - this.lastTrackAt < 300) {
      return {
        page,
        properties,
        context: {
          page,
          visitorId: this.visitorId,
        },
        timestamp: now,
        sessionId: this.config.sessionId,
        userId: this.config.userId as string | undefined,
        appId: this.config.appId as string | undefined,
      }
    }

    this.lastTrackedPage = page
    this.lastTrackAt = now

    const payload: TrackingPageData = {
      page,
      properties,
      context: {
        page,
        visitorId: this.visitorId,
      },
      timestamp: now,
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:page', payload)
    return payload
  }

  trackUser(userId: string, properties?: Record<string, unknown>): TrackingUserData {
    const payload: TrackingUserData = {
      userId,
      properties,
      context: {
        page: this.getCurrentPage(),
        visitorId: this.visitorId,
      },
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:user', payload)
    return payload
  }

  trackUv(properties?: Record<string, unknown>): TrackingUVData {
    const visitorId = this.visitorId ?? this.ensureVisitorId()
    const payload: TrackingUVData = {
      visitorId,
      properties,
      context: {
        page: this.getCurrentPage(),
        visitorId,
      },
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:uv', payload)
    return payload
  }

  private report(type: string, data: unknown): void {
    if (!this.config.enabled) {
      return
    }

    if (this.reporter) {
      this.reporter.report(type, data)
      return
    }

    if (this.config.debug) {
      console.warn('[TrackingPlugin]', type, data)
    }
  }

  private setupRouteListeners(): void {
    const handleRouteChange = () => {
      this.trackPage(this.getCurrentPage(), { routeType: 'navigation' })
    }

    window.addEventListener('popstate', handleRouteChange, true)
    this.removeListeners.push(() => window.removeEventListener('popstate', handleRouteChange, true))

    if (this.pluginConfig.trackHashRoute) {
      window.addEventListener('hashchange', handleRouteChange, true)
      this.removeListeners.push(() => window.removeEventListener('hashchange', handleRouteChange, true))
    }

    const routeHandler = () => handleRouteChange()
    window.addEventListener(ROUTE_CHANGE_EVENT, routeHandler, true)
    this.removeListeners.push(() => window.removeEventListener(ROUTE_CHANGE_EVENT, routeHandler, true))

    this.patchHistoryMethod()
  }

  private patchHistoryMethod(): void {
    if (typeof window === 'undefined' || !window.history) {
      return
    }

    const patchedWindow = window as HistoryPatchedWindow
    if (patchedWindow.__EZ_MONITOR_HISTORY_PATCHED__) {
      return
    }

    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)

    const wrap = (original: typeof window.history.pushState) => {
      return (...args: Parameters<typeof window.history.pushState>) => {
        const result = original.apply(window.history, args)
        window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
        return result
      }
    }

    window.history.pushState = wrap(originalPushState)
    window.history.replaceState = wrap(originalReplaceState)
    patchedWindow.__EZ_MONITOR_HISTORY_PATCHED__ = true

    this.removeListeners.push(() => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      patchedWindow.__EZ_MONITOR_HISTORY_PATCHED__ = false
    })
  }

  private getCurrentPage(): string {
    if (typeof window === 'undefined') {
      return ''
    }

    const hash = this.pluginConfig.trackHashRoute ? window.location.hash : ''
    return `${window.location.pathname}${window.location.search}${hash}`
  }

  private trackUvIfNeeded(reason: string): void {
    const visitorId = this.visitorId ?? this.ensureVisitorId()
    const today = this.getLocalDay()
    const storage = this.getStorage()
    const key = this.pluginConfig.uvStorageKey

    const record = storage ? this.readUVStorage(storage, key) : undefined
    if (record?.day === today && record.visitorId === visitorId) {
      return
    }

    this.trackUv({ reason, day: today })

    if (!storage) {
      return
    }

    const nextRecord: UVStorageRecord = {
      day: today,
      visitorId,
      lastReportAt: Date.now(),
    }

    try {
      storage.setItem(key, JSON.stringify(nextRecord))
    }
    catch {
      // Ignore storage failures.
    }
  }

  private ensureVisitorId(): string {
    const storage = this.getStorage()
    if (!storage) {
      return this.createVisitorId()
    }

    const key = this.pluginConfig.visitorIdStorageKey
    const record = this.readVisitorStorage(storage, key)
    if (record) {
      return record.visitorId
    }

    const visitorId = this.createVisitorId()
    const expiresAt = Date.now() + this.pluginConfig.visitorIdTtlDays * 24 * 60 * 60 * 1000

    try {
      storage.setItem(key, JSON.stringify({ visitorId, expiresAt }))
    }
    catch {
      // Ignore storage failures.
    }

    return visitorId
  }

  private createVisitorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      return Array.from(bytes).map(item => item.toString(16).padStart(2, '0')).join('')
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2, 12)}`
  }

  private getStorage(): Storage | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined
    }

    return localStorage
  }

  private readVisitorStorage(storage: Storage, key: string): { visitorId: string, expiresAt: number } | undefined {
    try {
      const raw = storage.getItem(key)
      if (!raw) {
        return undefined
      }

      const parsed = JSON.parse(raw) as { visitorId?: unknown, expiresAt?: unknown }
      const visitorId = typeof parsed.visitorId === 'string' ? parsed.visitorId : undefined
      const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : 0

      if (!visitorId || expiresAt <= Date.now()) {
        storage.removeItem(key)
        return undefined
      }

      return { visitorId, expiresAt }
    }
    catch {
      return undefined
    }
  }

  private readUVStorage(storage: Storage, key: string): UVStorageRecord | undefined {
    try {
      const raw = storage.getItem(key)
      if (!raw) {
        return undefined
      }

      const parsed = JSON.parse(raw) as UVStorageRecord
      if (typeof parsed.day !== 'string' || typeof parsed.visitorId !== 'string') {
        return undefined
      }

      return parsed
    }
    catch {
      return undefined
    }
  }

  private getLocalDay(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = `${now.getMonth() + 1}`.padStart(2, '0')
    const day = `${now.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private cleanup(): void {
    for (const remove of this.removeListeners.splice(0)) {
      remove()
    }
  }
}
