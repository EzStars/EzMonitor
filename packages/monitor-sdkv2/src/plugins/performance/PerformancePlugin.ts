import type { ReporterLike } from '../../reporting/types'
import type { SDKConfig } from '../../types/config'
import type { IPlugin, PluginStatus } from '../../types/plugin'
import type { PerformanceMetricName, PerformancePluginConfig } from './types'

interface CLSWindow {
  value: number
  startTime: number
  lastTime: number
}

type LayoutShiftLike = PerformanceEntry & {
  hadRecentInput: boolean
  value: number
}

type InteractionTimingLike = PerformanceEntry & {
  duration: number
  processingStart: number
  processingEnd: number
  interactionId?: number
  target?: EventTarget | null
}

interface ReportPayload extends Record<string, unknown> {
  value: number
  url?: string
  extra?: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp: number
}

const DEFAULT_CONFIG: Required<Omit<PerformancePluginConfig, 'metricFilter'>> & {
  metricFilter: NonNullable<PerformancePluginConfig['metricFilter']>
} = {
  observePaint: true,
  observeNavigation: true,
  observeLCP: true,
  observeCLS: true,
  observeINP: true,
  flushOnHidden: true,
  metricFilter: () => true,
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

function getCurrentUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.location.href
}

function supportsEntryType(entryType: string): boolean {
  if (typeof PerformanceObserver === 'undefined') {
    return false
  }

  const supportedEntryTypes = (PerformanceObserver as typeof PerformanceObserver & {
    supportedEntryTypes?: string[]
  }).supportedEntryTypes

  if (!supportedEntryTypes) {
    return true
  }

  return supportedEntryTypes.includes(entryType)
}

export class PerformancePlugin implements IPlugin {
  readonly name = 'performance'
  readonly version = '1.0.0'
  status: PluginStatus = 'registered'

  private config: SDKConfig = {}
  private reporter?: ReporterLike
  private pluginConfig = { ...DEFAULT_CONFIG }
  private observers: PerformanceObserver[] = []
  private removeListeners: Array<() => void> = []
  private seenMetrics = new Set<PerformanceMetricName>()
  private finalized = false
  private lcpEntry?: LargestContentfulPaint
  private clsWindow: CLSWindow | null = null
  private clsValue = 0
  private inpEntry?: InteractionTimingLike

  constructor(config: Partial<PerformancePluginConfig> = {}) {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...config,
    }
  }

  configure(pluginConfig: Record<string, unknown>, _sdkConfig: SDKConfig): void {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...(pluginConfig as Partial<PerformancePluginConfig>),
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

    if (this.config.enabled === false) {
      return
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    this.setupLifecycleListeners()
    this.setupNavigationTiming()
    this.setupPaintObserver()
    this.setupLcpObserver()
    this.setupClsObserver()
    this.setupInpObserver()
  }

  stop(): void {
    this.flushFinalMetrics()
    this.cleanup()
    this.status = 'stopped'
  }

  destroy(): void {
    this.flushFinalMetrics()
    this.cleanup()
    this.status = 'destroyed'
  }

  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    if (this.pluginConfig.flushOnHidden) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          this.flushFinalMetrics()
          void this.reporter?.flush()
        }
      }
      const handlePageHide = () => {
        this.flushFinalMetrics()
        void this.reporter?.flush()
      }

      document.addEventListener('visibilitychange', handleVisibilityChange, true)
      window.addEventListener('pagehide', handlePageHide, true)

      this.removeListeners.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange, true))
      this.removeListeners.push(() => window.removeEventListener('pagehide', handlePageHide, true))
    }
  }

  private setupNavigationTiming(): void {
    if (!this.pluginConfig.observeNavigation || typeof performance === 'undefined') {
      return
    }

    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (!navigationEntry) {
      return
    }

    const value = navigationEntry.responseStart - navigationEntry.startTime
    if (!Number.isFinite(value) || value < 0) {
      return
    }

    this.reportMetric('ttfb', {
      value: round(value),
      url: getCurrentUrl(),
      extra: {
        entryType: navigationEntry.entryType,
        type: navigationEntry.type,
        startTime: round(navigationEntry.startTime),
        responseStart: round(navigationEntry.responseStart),
        domContentLoadedEventEnd: round(navigationEntry.domContentLoadedEventEnd),
        loadEventEnd: round(navigationEntry.loadEventEnd),
        transferSize: navigationEntry.transferSize,
        nextHopProtocol: navigationEntry.nextHopProtocol,
      },
      timestamp: Date.now(),
    })
  }

  private setupPaintObserver(): void {
    if (!this.pluginConfig.observePaint || !supportsEntryType('paint')) {
      return
    }

    this.observe('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-paint') {
          this.reportOnce('fp', {
            value: round(entry.startTime),
            url: getCurrentUrl(),
            extra: {
              entryType: entry.entryType,
              startTime: round(entry.startTime),
            },
            timestamp: Date.now(),
          })
        }

        if (entry.name === 'first-contentful-paint') {
          this.reportOnce('fcp', {
            value: round(entry.startTime),
            url: getCurrentUrl(),
            extra: {
              entryType: entry.entryType,
              startTime: round(entry.startTime),
            },
            timestamp: Date.now(),
          })
        }
      }
    }, { type: 'paint', buffered: true })
  }

  private setupLcpObserver(): void {
    if (!this.pluginConfig.observeLCP || !supportsEntryType('largest-contentful-paint')) {
      return
    }

    this.observe('largest-contentful-paint', (entries) => {
      for (const entry of entries) {
        this.lcpEntry = entry as LargestContentfulPaint
      }
    }, { type: 'largest-contentful-paint', buffered: true })
  }

  private setupClsObserver(): void {
    if (!this.pluginConfig.observeCLS || !supportsEntryType('layout-shift')) {
      return
    }

    this.observe('layout-shift', (entries) => {
      for (const entry of entries) {
        const shiftEntry = entry as LayoutShiftLike
        if (shiftEntry.hadRecentInput) {
          continue
        }

        this.updateClsValue(shiftEntry)
      }
    }, { type: 'layout-shift', buffered: true })
  }

  private setupInpObserver(): void {
    if (!this.pluginConfig.observeINP || !supportsEntryType('event')) {
      return
    }

    const options = {
      type: 'event',
      buffered: true,
      durationThreshold: 40,
    } as PerformanceObserverInit & { durationThreshold: number }

    this.observe('event', (entries) => {
      for (const entry of entries) {
        const eventEntry = entry as InteractionTimingLike
        if (typeof eventEntry.interactionId !== 'number' || eventEntry.interactionId <= 0) {
          continue
        }

        if (!this.inpEntry || eventEntry.duration >= this.inpEntry.duration) {
          this.inpEntry = eventEntry
        }
      }
    }, options)
  }

  private observe(
    metricType: string,
    callback: (entries: PerformanceEntry[]) => void,
    options: PerformanceObserverInit,
  ): void {
    if (typeof PerformanceObserver === 'undefined') {
      return
    }

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries())
      })

      observer.observe(options)
      this.observers.push(observer)
    }
    catch (error) {
      if (this.config.debug) {
        console.warn(`[PerformancePlugin] failed to observe ${metricType}`, error)
      }
    }
  }

  private updateClsValue(entry: LayoutShiftLike): void {
    const startTime = entry.startTime

    if (
      this.clsWindow
      && startTime - this.clsWindow.lastTime <= 1000
      && startTime - this.clsWindow.startTime <= 5000
    ) {
      this.clsWindow.value += entry.value
      this.clsWindow.lastTime = startTime
    }
    else {
      this.clsWindow = {
        value: entry.value,
        startTime,
        lastTime: startTime,
      }
    }

    this.clsValue = Math.max(this.clsValue, this.clsWindow.value)
  }

  private getClsValueForFlush(): number {
    if (this.clsValue > 0) {
      return this.clsValue
    }

    if (typeof performance === 'undefined' || !this.pluginConfig.observeCLS) {
      return 0
    }

    const entries = performance.getEntriesByType('layout-shift') as PerformanceEntry[]
    let currentWindow: CLSWindow | null = null
    let maxValue = 0

    for (const entry of entries) {
      const shiftEntry = entry as LayoutShiftLike
      if (shiftEntry.hadRecentInput) {
        continue
      }

      const startTime = shiftEntry.startTime
      if (
        currentWindow
        && startTime - currentWindow.lastTime <= 1000
        && startTime - currentWindow.startTime <= 5000
      ) {
        currentWindow.value += shiftEntry.value
        currentWindow.lastTime = startTime
      }
      else {
        currentWindow = {
          value: shiftEntry.value,
          startTime,
          lastTime: startTime,
        }
      }

      maxValue = Math.max(maxValue, currentWindow.value)
    }

    return maxValue
  }

  private flushFinalMetrics(): void {
    if (this.finalized) {
      return
    }

    this.finalized = true
    const clsValue = this.getClsValueForFlush()

    if (this.lcpEntry) {
      this.reportMetric('lcp', {
        value: round(this.lcpEntry.startTime),
        url: getCurrentUrl(),
        extra: {
          entryType: this.lcpEntry.entryType,
          startTime: round(this.lcpEntry.startTime),
          renderTime: round(this.lcpEntry.renderTime),
          loadTime: round(this.lcpEntry.loadTime),
          size: this.lcpEntry.size,
          id: this.lcpEntry.id,
          url: this.lcpEntry.url,
          element: this.describeElement(this.lcpEntry.element),
        },
        timestamp: Date.now(),
      })
    }

    if (this.pluginConfig.observeCLS && clsValue > 0) {
      this.reportMetric('cls', {
        value: round(clsValue),
        url: getCurrentUrl(),
        extra: {
          value: round(clsValue),
          windows: this.clsWindow
            ? [
                {
                  value: round(this.clsWindow.value),
                  startTime: round(this.clsWindow.startTime),
                  lastTime: round(this.clsWindow.lastTime),
                },
              ]
            : [],
        },
        timestamp: Date.now(),
      })
    }

    if (this.inpEntry) {
      this.reportMetric('inp', {
        value: round(this.inpEntry.duration),
        url: getCurrentUrl(),
        extra: {
          entryType: this.inpEntry.entryType,
          startTime: round(this.inpEntry.startTime),
          duration: round(this.inpEntry.duration),
          processingStart: round(this.inpEntry.processingStart),
          processingEnd: round(this.inpEntry.processingEnd),
          interactionId: this.inpEntry.interactionId,
          target: this.describeElement(this.inpEntry.target as Element | null),
        },
        timestamp: Date.now(),
      })
    }
  }

  private reportOnce(metricType: PerformanceMetricName, payload: ReportPayload): void {
    if (this.seenMetrics.has(metricType)) {
      return
    }

    this.seenMetrics.add(metricType)
    this.reportMetric(metricType, payload)
  }

  private reportMetric(metricType: PerformanceMetricName, payload: ReportPayload): void {
    if (this.config.enabled === false) {
      return
    }

    if (!this.pluginConfig.metricFilter(metricType, payload)) {
      return
    }

    const type = `performance_${metricType}`

    if (this.reporter) {
      this.reporter.report(type, payload)
      return
    }

    if (this.config.debug) {
      console.warn('[PerformancePlugin]', type, payload)
    }
  }

  private describeElement(element: Element | null | undefined): string | undefined {
    if (!element) {
      return undefined
    }

    const tagName = element.tagName?.toLowerCase() ?? 'unknown'
    const id = element.id ? `#${element.id}` : ''
    const className = typeof element.className === 'string' && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).join('.')}`
      : ''

    return `${tagName}${id}${className}`
  }

  private cleanup(): void {
    for (const observer of this.observers) {
      observer.disconnect()
    }

    this.observers = []

    for (const removeListener of this.removeListeners) {
      removeListener()
    }

    this.removeListeners = []
    this.finalized = false
    this.seenMetrics.clear()
    this.lcpEntry = undefined
    this.clsWindow = null
    this.clsValue = 0
    this.inpEntry = undefined
  }
}
