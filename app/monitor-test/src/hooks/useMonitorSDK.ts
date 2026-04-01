import { useEffect, useMemo, useState } from 'react'
import {
  ensureSDKStarted,
  getSDKStatus,
  trackEvent,
  trackPage,
  trackUser,
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
    trackEvent,
    trackPage,
    trackUser,
  }), [status])
}
