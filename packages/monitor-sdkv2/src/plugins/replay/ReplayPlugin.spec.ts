import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushReplayOnError, getReplayErrorContext } from './bridge'
import { ReplayPlugin } from './ReplayPlugin'

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

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

  it('restarts rrweb recording after flush so each segment has FullSnapshot', async () => {
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
      recordMode: 'rrweb',
      captureClick: false,
      captureRoute: false,
      captureScroll: false,
      captureVisibility: false,
      captureInput: false,
      captureSnapshot: false,
      flushIntervalMs: 0,
      sampleRate: 1,
    })
    const pluginState = plugin as unknown as {
      rrwebEvents: Array<Record<string, unknown>>
      rrwebStop?: () => void
      startRrwebRecording: () => Promise<void>
    }
    const startRrwebRecordingSpy = vi
      .spyOn(pluginState, 'startRrwebRecording')
      .mockImplementation(async () => {
        const now = Date.now()
        pluginState.rrwebEvents.push({ type: 4, timestamp: now })
        pluginState.rrwebEvents.push({ type: 2, timestamp: now + 1 })
        pluginState.rrwebStop = vi.fn()
      })

    plugin.setReporter(reporter as never)
    plugin.init({ enabled: true, appId: 'app-1', sessionId: 'session-rrweb-1' })
    plugin.start({ enabled: true, appId: 'app-1', sessionId: 'session-rrweb-1' })

    await flushMicrotasks()
    expect(startRrwebRecordingSpy).toHaveBeenCalledTimes(1)

    pluginState.rrwebEvents.push({ type: 3, timestamp: Date.now() + 2, data: { source: 0 } })
    flushReplayOnError('error_round_1')
    await flushMicrotasks()

    expect(startRrwebRecordingSpy).toHaveBeenCalledTimes(2)

    pluginState.rrwebEvents.push({ type: 3, timestamp: Date.now() + 3, data: { source: 0 } })
    flushReplayOnError('error_round_2')
    await flushMicrotasks()

    const replayCalls = reporter.report.mock.calls.filter(([type]) => type === 'replay')
    expect(replayCalls).toHaveLength(2)

    const firstPayload = replayCalls[0][1] as { rrwebEvents?: Array<{ type?: number }> }
    const secondPayload = replayCalls[1][1] as { rrwebEvents?: Array<{ type?: number }> }

    expect(firstPayload.rrwebEvents?.some(item => item.type === 2)).toBe(true)
    expect(secondPayload.rrwebEvents?.some(item => item.type === 2)).toBe(true)

    plugin.destroy()
  })
})
