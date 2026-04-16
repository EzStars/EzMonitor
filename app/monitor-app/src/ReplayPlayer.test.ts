import { describe, expect, it } from 'vitest'
import { normalizeReplayEvents } from './utils/replay'

describe('normalizeReplayEvents', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeReplayEvents()).toEqual([])
    expect(normalizeReplayEvents([])).toEqual([])
  })

  it('keeps direct rrweb events with numeric type/timestamp', () => {
    const input = [
      {
        type: 2,
        timestamp: 1700000000000,
        data: {
          source: 1,
        },
      },
    ]

    expect(normalizeReplayEvents(input)).toEqual(input)
  })

  it('unwraps wrapper events and applies fallback timestamp', () => {
    const input = [
      {
        at: 1700000000100,
        data: {
          type: 3,
          data: {
            source: 2,
          },
        },
      },
    ]

    expect(normalizeReplayEvents(input)).toEqual([
      {
        type: 3,
        timestamp: 1700000000100,
        data: {
          source: 2,
        },
      },
    ])
  })

  it('filters invalid events', () => {
    const input = [
      null,
      {
        type: '2',
        timestamp: 1700000000000,
      },
      {
        at: 'not-a-number',
        data: {
          type: 4,
        },
      },
    ] as unknown as Array<Record<string, unknown>>

    expect(normalizeReplayEvents(input)).toEqual([])
  })
})
