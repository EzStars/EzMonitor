import { useEffect, useMemo, useState } from 'react'
import {
  ensureSDKStarted,
  flushReplay,
  getSDKStatus,
  reportError,
  trackEvent,
  trackPage,
  trackUser,
  trackUv,
} from '../services/sdkRuntime'

export function useMonitorSDK() {
  const [status, setStatus] = useState(getSDKStatus())

  useEffect(() => {
    void ensureSDKStarted()
      .then(() => {
        setStatus(getSDKStatus())
      })
      .catch((error: unknown) => {
        console.error('[monitor-test] sdk start failed', error)
        setStatus(getSDKStatus())
      })
  }, [])

  return useMemo(() => ({
    status,
    flushReplay,
    reportError,
    trackEvent,
    trackPage,
    trackUv,
    trackUser,
  }), [status])
}
