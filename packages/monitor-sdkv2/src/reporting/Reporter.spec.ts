import type { SDKConfig } from '../types/config'

import type { ITransportAdapter } from './types'
import { describe, expect, it } from 'vitest'
import { Reporter } from './Reporter'

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

class MockTransport implements ITransportAdapter {
  readonly type = 'xhr' as const
  readonly calls: string[] = []

  constructor(private readonly failures = 0) {}

  isSupported(): boolean {
    return true
  }

  async send(url: string, body: string): Promise<void> {
    this.calls.push(`${url}::${body}`)
    if (this.calls.length <= this.failures) {
      throw new Error('mock transport failure')
    }
  }
}

class TypedMockTransport implements ITransportAdapter {
  readonly calls: string[] = []

  constructor(readonly type: 'beacon' | 'image' | 'xhr') {}

  isSupported(): boolean {
    return true
  }

  async send(url: string, body: string): Promise<void> {
    this.calls.push(`${url}::${body}`)
  }
}

function createConfig(overrides: Partial<SDKConfig> = {}): SDKConfig {
  return {
    batchInterval: 0,
    batchSize: 2,
    enabled: true,
    enableBatch: true,
    enableLocalStorage: true,
    localStorageKey: 'reporter-test',
    reportUrl: '/collect',
    ...overrides,
  }
}

describe('reporter', () => {
  it('serializes queued items into backend batch format', async () => {
    const transport = new MockTransport()
    const reporter = new Reporter(() => createConfig({ batchSize: 10 }), {
      storage: new MemoryStorage(),
      transports: [transport],
    })

    await reporter.start()
    reporter.report('tracking:event', { eventName: 'button_click', properties: { id: 1 } })
    reporter.report('tracking:page', { page: '/tracking/manual-page', properties: { from: 'test' } })
    reporter.report('tracking:uv', { visitorId: 'visitor-01', properties: { day: '2026-04-07' } })
    reporter.report('tracking:user', { userId: 'user_1001', properties: { role: 'tester' } })
    reporter.report('replay', {
      segmentId: 'segment-1',
      startedAt: Date.now(),
      endedAt: Date.now(),
      eventCount: 1,
      route: '/home',
      reason: 'error',
      sample: [{ type: 'click', at: Date.now(), data: { target: 'button#pay' } }],
    })
    reporter.report('performance_long_task', { duration: 80, page: '/performance' })
    reporter.report('error_js', { type: 'sync', message: 'boom', page: '/error' })
    await reporter.flush()

    expect(transport.calls).toHaveLength(1)
    const [, body] = transport.calls[0].split('::')
    const parsed = JSON.parse(body) as {
      items: Array<{
        type: string
        eventName?: string
        metricType?: string
        errorType?: string
        value?: number
        userId?: string
        properties?: Record<string, unknown>
      }>
    }
    expect(parsed.items).toHaveLength(7)
    expect(parsed.items[0]).toMatchObject({
      type: 'tracking',
      eventName: 'button_click',
      properties: { id: 1 },
    })
    expect(parsed.items[1]).toMatchObject({
      type: 'tracking',
      eventName: 'page_view',
      properties: { from: 'test', page: '/tracking/manual-page' },
    })
    expect(parsed.items[2]).toMatchObject({
      type: 'tracking',
      eventName: 'uv_visit',
      properties: { day: '2026-04-07', visitorId: 'visitor-01' },
    })
    expect(parsed.items[3]).toMatchObject({
      type: 'tracking',
      eventName: 'user_identify',
      userId: 'user_1001',
    })
    expect(parsed.items[4]).toMatchObject({
      type: 'replay',
      segmentId: 'segment-1',
      eventCount: 1,
      route: '/home',
    })
    expect(parsed.items[5]).toMatchObject({
      type: 'performance',
      metricType: 'performance_long_task',
      value: 80,
    })
    expect(parsed.items[6]).toMatchObject({
      type: 'error',
      errorType: 'sync',
      message: 'boom',
    })
  })

  it('restores persisted queue on start', async () => {
    const storage = new MemoryStorage()
    const firstReporter = new Reporter(() => createConfig({ batchSize: 10 }), {
      storage,
      transports: [new MockTransport()],
    })

    await firstReporter.start()
    firstReporter.report('tracking:event', { persisted: true })

    const secondTransport = new MockTransport()
    const secondReporter = new Reporter(() => createConfig({ batchSize: 10 }), {
      storage,
      transports: [secondTransport],
    })

    await secondReporter.start()
    await secondReporter.flush()

    expect(secondTransport.calls).toHaveLength(1)
    const [, body] = secondTransport.calls[0].split('::')
    const parsed = JSON.parse(body) as { items: Array<{ type: string, properties?: { persisted?: boolean } }> }
    expect(parsed.items[0]).toMatchObject({
      type: 'tracking',
      properties: { persisted: true },
    })
  })

  it('retries failed batches', async () => {
    const transport = new MockTransport(1)
    const reporter = new Reporter(() => createConfig({ enableBatch: false, maxRetryCount: 2, retryDelay: 0 }), {
      storage: new MemoryStorage(),
      transports: [transport],
    })

    await reporter.start()
    reporter.report('tracking:event', { retry: true })
    await reporter.flush()

    expect(transport.calls).toHaveLength(2)
  })

  it('prefers beacon transport for small payloads', async () => {
    const imageTransport = new TypedMockTransport('image')
    const beaconTransport = new TypedMockTransport('beacon')
    const xhrTransport = new TypedMockTransport('xhr')
    const reporter = new Reporter(() => createConfig({ batchSize: 1 }), {
      storage: new MemoryStorage(),
      transports: [imageTransport, beaconTransport, xhrTransport],
    })

    await reporter.start()
    reporter.report('tracking:event', { small: true })
    await reporter.flush()

    expect(beaconTransport.calls).toHaveLength(1)
    expect(imageTransport.calls).toHaveLength(0)
    expect(xhrTransport.calls).toHaveLength(0)
  })
})
