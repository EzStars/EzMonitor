import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMonitorQuery } from './useMonitorQuery'

describe('useMonitorQuery', () => {
  it('loads data on mount and supports manual refresh', async () => {
    const factory = vi
      .fn<() => Promise<{ id: number }>>()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })

    const { result } = renderHook(({ depsKey }) => useMonitorQuery(factory, depsKey), {
      initialProps: {
        depsKey: 'initial',
      },
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual({ id: 1 })
    })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual({ id: 2 })
      expect(result.current.error).toBeNull()
    })
  })

  it('keeps last successful data when refresh fails under same depsKey', async () => {
    const factory = vi
      .fn<() => Promise<{ id: number }>>()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('refresh failed'))

    const { result } = renderHook(({ depsKey }) => useMonitorQuery(factory, depsKey), {
      initialProps: {
        depsKey: 'stable-key',
      },
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual({ id: 1 })
    })

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual({ id: 1 })
      expect(result.current.error).toBe('refresh failed')
    })
  })

  it('clears stale data when depsKey changes and new request fails', async () => {
    const factory = vi
      .fn<() => Promise<{ id: number }>>()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('new key failed'))

    const { result, rerender } = renderHook(({ depsKey }) => useMonitorQuery(factory, depsKey), {
      initialProps: {
        depsKey: 'key-a',
      },
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual({ id: 1 })
      expect(result.current.error).toBeNull()
    })

    rerender({ depsKey: 'key-b' })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBe('new key failed')
    })
  })
})
