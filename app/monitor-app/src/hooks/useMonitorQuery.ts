import { useCallback, useEffect, useRef, useState } from 'react'

type QueryState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return '请求失败'
}

export function useMonitorQuery<T>(factory: () => Promise<T>, depsKey: string) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const requestIdRef = useRef(0)
  const lastSuccessfulKeyRef = useRef<string | null>(null)
  const depsKeyRef = useRef(depsKey)
  const factoryRef = useRef(factory)
  depsKeyRef.current = depsKey
  factoryRef.current = factory

  const run = useCallback(async (): Promise<T | undefined> => {
    const requestId = ++requestIdRef.current
    const requestKey = depsKeyRef.current
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const data = await factoryRef.current()
      if (requestId === requestIdRef.current) {
        lastSuccessfulKeyRef.current = requestKey
        setState({ data, loading: false, error: null })
      }
      return data
    } catch (error) {
      if (requestId === requestIdRef.current) {
        if (lastSuccessfulKeyRef.current === requestKey) {
          setState((current) => ({ ...current, loading: false, error: toErrorMessage(error) }))
        } else {
          setState({ data: null, loading: false, error: toErrorMessage(error) })
        }
      }
      return undefined
    }
  }, [])

  useEffect(() => {
    void run()
  }, [depsKey, run])

  return {
    ...state,
    refresh: run,
  }
}

