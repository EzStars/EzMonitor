import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushReplayOnError, getReplayErrorContext } from './bridge'
import { ReplayPlugin } from './ReplayPlugin'

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
  const listeners = new Map<string, Set<(event?: any) => void>>()

  return {
    listeners,
    addEventListener(type: string, listener: (event?: any) => void) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }

      listeners.get(type)?.add(listener)
    },
    removeEventListener(type: string, listener: (event?: any) => void) {
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
    href: 'https://example.com/replay',
    pathname: '/replay',
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
    scrollX: 12,
    scrollY: 34,
    localStorage: storage,
  }
}

function createDocumentMock() {
  const eventStore = createEventStore()

  return {
    ...eventStore,
    visibilityState: 'visible',
    title: 'Replay Spec',
    documentElement: {
      outerHTML: '<html><body><input type="text" value="token-123"><button>ok</button></body></html>',
    },
  }
}

describe('replay plugin', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('collects events and flushes a replay segment', () => {
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

    const plugin = new ReplayPlugin({
      captureClick: true,
      captureRoute: false,
      captureScroll: false,
      captureVisibility: false,
      captureInput: false,
      captureSnapshot: false,
      flushIntervalMs: 0,
      sampleRate: 1,
    })
    plugin.setReporter(reporter as never)
    plugin.init({ enabled: true, appId: 'app-1', sessionId: 'session-1' })
    plugin.start({ enabled: true, appId: 'app-1', sessionId: 'session-1' })

    windowMock.dispatchEvent({
      type: 'click',
      clientX: 12,
      clientY: 34,
      target: {
        className: '',
        closest: () => null,
        id: 'submit',
        matches: () => false,
        tagName: 'BUTTON',
      },
    })

    expect(getReplayErrorContext()).toMatchObject({
      eventCount: 1,
      route: '/replay',
    })

    flushReplayOnError('error')

    const replayCalls = reporter.report.mock.calls.filter(([type]) => type === 'replay')
    expect(replayCalls).toHaveLength(1)
    expect(replayCalls[0][1]).toMatchObject({
      reason: 'error',
      segmentId: expect.any(String),
      sample: expect.any(Array),
      eventCount: 1,
      context: expect.objectContaining({
        replay: expect.objectContaining({
          segmentId: expect.any(String),
          eventCount: 1,
        }),
      }),
    })
  })
})
