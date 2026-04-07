import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setReplayErrorContextProvider } from '../replay/bridge'
import { ErrorPlugin } from './ErrorPlugin'

describe('error plugin', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    setReplayErrorContextProvider(undefined)
  })

  it('attaches replay context to error payloads', () => {
    setReplayErrorContextProvider(() => ({
      eventCount: 2,
      lastEventAt: 123,
      route: '/checkout',
      segmentId: 'segment-1',
      sample: [
        {
          at: 120,
          data: { target: 'button#pay' },
          type: 'click',
        },
      ],
    }))

    const reporter = {
      flush: vi.fn().mockResolvedValue(undefined),
      report: vi.fn(),
      prepare: vi.fn().mockResolvedValue(undefined),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
    }

    const plugin = new ErrorPlugin()
    plugin.setReporter(reporter as never)
    plugin.init({ enabled: true, appId: 'app-1', sessionId: 'session-1' })

    const createPayload = (plugin as unknown as {
      createPayload: (this: ErrorPlugin, type: string, data: { message: string, stack?: string, detail?: Record<string, unknown> }) => Record<string, unknown>
    }).createPayload

    const payload = createPayload.call(plugin, 'error_js', {
      detail: { foo: 'bar' },
      message: 'boom',
      stack: 'at render (app.js:1:1)',
    })

    expect(payload.detail).toMatchObject({
      foo: 'bar',
      replay: {
        segmentId: 'segment-1',
        route: '/checkout',
      },
    })
  })
})
