import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrackingPlugin } from './TrackingPlugin'

type Listener = (event?: any) => void

class MemoryStorage {
  private readonly store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }
}

function createEventStore() {
  const listeners = new Map<string, Set<Listener>>()

  return {
    listeners,
    addEventListener(type: string, listener: Listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }

      listeners.get(type)?.add(listener)
    },
    removeEventListener(type: string, listener: Listener) {
      listeners.get(type)?.delete(listener)
    },
    dispatchEvent(event: { type: string, [key: string]: any }) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event)
      }
      return true
    },
  }
}

function createWindowMock(storage: MemoryStorage) {
  const eventStore = createEventStore()
  const location = {
    hash: '',
    href: 'https://example.com/home',
    pathname: '/home',
    search: '',
  }

  const history = {
    pushState: vi.fn((_state: unknown, _title: string, url?: string | URL | null) => {
      if (typeof url === 'string') {
        location.pathname = url
        location.href = `https://example.com${url}`
      }
    }),
    replaceState: vi.fn((_state: unknown, _title: string, url?: string | URL | null) => {
      if (typeof url === 'string') {
        location.pathname = url
        location.href = `https://example.com${url}`
      }
    }),
  }

  return {
    ...eventStore,
    history,
    location,
    scrollX: 0,
    scrollY: 0,
    localStorage: storage,
  }
}

function createDocumentMock() {
  const eventStore = createEventStore()

  return {
    ...eventStore,
    visibilityState: 'visible',
    title: 'Tracking Spec',
    referrer: 'https://referrer.example.com/',
  }
}

describe('tracking plugin', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports pv and uv and dedupes repeated page views', () => {
    const storage = new MemoryStorage()
    const windowMock = createWindowMock(storage)
    const documentMock = createDocumentMock()
    const reporter = {
      flush: vi.fn().mockResolvedValue(undefined),
      report: vi.fn(),
      prepare: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
    }

    vi.stubGlobal('window', windowMock)
    vi.stubGlobal('document', documentMock)
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('Event', class {
      constructor(public type: string) {}
    })

    const plugin = new TrackingPlugin({
      autoTrackPage: false,
      autoTrackRoute: true,
      autoTrackUv: true,
    })
    plugin.setReporter(reporter as never)
    plugin.init({ enabled: true, appId: 'app-1', sessionId: 'session-1' })
    plugin.start({ enabled: true, appId: 'app-1', sessionId: 'session-1' })

    const uvCalls = reporter.report.mock.calls.filter(([type]) => type === 'tracking:uv')
    expect(uvCalls).toHaveLength(1)

    plugin.trackPage('/repeat')
    plugin.trackPage('/repeat')

    const repeatPageCalls = reporter.report.mock.calls.filter(([type, payload]) => type === 'tracking:page' && payload.page === '/repeat')
    expect(repeatPageCalls).toHaveLength(1)

    windowMock.history.pushState({}, '', '/route-next')
    const routeCalls = reporter.report.mock.calls.filter(([type, payload]) => type === 'tracking:page' && payload.page === '/route-next')
    expect(routeCalls).toHaveLength(1)

    documentMock.dispatchEvent({ type: 'visibilitychange' })
    windowMock.dispatchEvent({ type: 'pagehide' })
    expect(reporter.flush).toHaveBeenCalled()
  })
})
