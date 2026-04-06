import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerformancePlugin } from './PerformancePlugin'

type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void

class MockReporter {
  report = vi.fn()
  flush = vi.fn().mockResolvedValue(undefined)
}

class MockPerformanceObserver {
  static supportedEntryTypes = ['paint', 'largest-contentful-paint', 'layout-shift', 'event']

  readonly observe = vi.fn()
  readonly disconnect = vi.fn()

  constructor(private readonly callback: ObserverCallback) {}

  trigger(entries: PerformanceEntry[]): void {
    this.callback({
      getEntries: () => entries,
    })
  }
}

const observers: MockPerformanceObserver[] = []
const documentListeners = new Map<string, Set<() => void>>()
const windowListeners = new Map<string, Set<() => void>>()

function addListener(store: Map<string, Set<() => void>>, type: string, listener: () => void) {
  if (!store.has(type)) {
    store.set(type, new Set())
  }

  store.get(type)?.add(listener)
}

function removeListener(store: Map<string, Set<() => void>>, type: string, listener: () => void) {
  store.get(type)?.delete(listener)
}

function emit(store: Map<string, Set<() => void>>, type: string) {
  for (const listener of store.get(type) ?? []) {
    listener()
  }
}

function createPlugin() {
  const plugin = new PerformancePlugin()
  const reporter = new MockReporter()

  plugin.setReporter(reporter as never)
  plugin.init({
    enabled: true,
    debug: false,
    appId: 'app-1',
    sessionId: 'session-1',
  })

  plugin.start({
    enabled: true,
    debug: false,
    appId: 'app-1',
    sessionId: 'session-1',
  })

  return { plugin, reporter }
}

beforeEach(() => {
  observers.length = 0
  documentListeners.clear()
  windowListeners.clear()

  vi.stubGlobal('PerformanceObserver', class extends MockPerformanceObserver {
    constructor(callback: ObserverCallback) {
      super(callback)
      observers.push(this)
    }
  })

  vi.stubGlobal('window', {
    location: {
      href: 'https://example.com/performance',
    },
    addEventListener: (type: string, listener: () => void) => addListener(windowListeners, type, listener),
    removeEventListener: (type: string, listener: () => void) => removeListener(windowListeners, type, listener),
  })

  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type: string, listener: () => void) => addListener(documentListeners, type, listener),
    removeEventListener: (type: string, listener: () => void) => removeListener(documentListeners, type, listener),
  })

  vi.stubGlobal('performance', {
    getEntriesByType: vi.fn((type: string) => {
      if (type === 'navigation') {
        return [
          {
            entryType: 'navigation',
            startTime: 0,
            responseStart: 123.45,
            domContentLoadedEventEnd: 200,
            loadEventEnd: 400,
            transferSize: 1024,
            type: 'navigate',
            nextHopProtocol: 'h2',
          },
        ]
      }

      return []
    }),
  })
})

describe('performancePlugin', () => {
  it('reports paint and navigation metrics immediately', () => {
    const { reporter } = createPlugin()

    expect(reporter.report).toHaveBeenCalledWith(
      'performance_ttfb',
      expect.objectContaining({
        value: 123.45,
        url: 'https://example.com/performance',
      }),
    )

    const paintObserver = observers[0]
    paintObserver.trigger([
      { entryType: 'paint', name: 'first-paint', startTime: 11.11 } as PerformanceEntry,
      { entryType: 'paint', name: 'first-contentful-paint', startTime: 22.22 } as PerformanceEntry,
    ])

    expect(reporter.report).toHaveBeenCalledWith(
      'performance_fp',
      expect.objectContaining({ value: 11.11 }),
    )
    expect(reporter.report).toHaveBeenCalledWith(
      'performance_fcp',
      expect.objectContaining({ value: 22.22 }),
    )
  })

  it('flushes final vitals on pagehide and stops observers', () => {
    const { plugin, reporter } = createPlugin()

    observers[1].trigger([
      { entryType: 'largest-contentful-paint', startTime: 312.34, renderTime: 300, loadTime: 320, size: 1200, id: 'hero', url: 'https://example.com/hero', element: null } as PerformanceEntry,
    ])

    observers[2].trigger([
      { entryType: 'layout-shift', startTime: 10, value: 0.1, hadRecentInput: false } as PerformanceEntry,
      { entryType: 'layout-shift', startTime: 700, value: 0.2, hadRecentInput: false } as PerformanceEntry,
    ])

    observers[3].trigger([
      { entryType: 'event', startTime: 50, duration: 88.88, processingStart: 60, processingEnd: 70, interactionId: 1, target: null } as PerformanceEntry,
    ])

    emit(windowListeners, 'pagehide')

    expect(reporter.report).toHaveBeenCalledWith(
      'performance_lcp',
      expect.objectContaining({ value: 312.34 }),
    )
    expect(reporter.report).toHaveBeenCalledWith(
      'performance_cls',
      expect.objectContaining({ value: 0.3 }),
    )
    expect(reporter.report).toHaveBeenCalledWith(
      'performance_inp',
      expect.objectContaining({ value: 88.88 }),
    )
    expect(reporter.flush).toHaveBeenCalled()

    plugin.stop()

    for (const observer of observers) {
      expect(observer.disconnect).toHaveBeenCalled()
    }
  })

  it('recalculates cls from buffered layout-shift entries when observer callback is missed', () => {
    const { reporter } = createPlugin()

    vi.stubGlobal('performance', {
      getEntriesByType: vi.fn((type: string) => {
        if (type === 'navigation') {
          return [
            {
              entryType: 'navigation',
              startTime: 0,
              responseStart: 123.45,
              domContentLoadedEventEnd: 200,
              loadEventEnd: 400,
              transferSize: 1024,
              type: 'navigate',
              nextHopProtocol: 'h2',
            },
          ]
        }

        if (type === 'layout-shift') {
          return [
            { entryType: 'layout-shift', startTime: 10, value: 0.1, hadRecentInput: false } as PerformanceEntry,
            { entryType: 'layout-shift', startTime: 700, value: 0.2, hadRecentInput: false } as PerformanceEntry,
          ]
        }

        return []
      }),
    })

    emit(windowListeners, 'pagehide')

    expect(reporter.report).toHaveBeenCalledWith(
      'performance_cls',
      expect.objectContaining({ value: 0.3 }),
    )
  })
})
