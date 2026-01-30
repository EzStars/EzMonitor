'use client'

import { useEffect } from 'react'
import { initMonitorSDK } from '@/lib/monitor'

/**
 * Monitor SDK Provider
 * 用于在客户端初始化监控 SDK
 */
export function MonitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 在客户端初始化 SDK
    let destroyed = false
    let sdkRef: Awaited<ReturnType<typeof initMonitorSDK>> = null;

    (async () => {
      const sdk = await initMonitorSDK()
      sdkRef = sdk

      if (sdk && !destroyed) {
        console.log('[MonitorProvider] SDK 初始化完成', {
          status: sdk.getStatus(),
          sessionId: sdk.getSessionId(),
        })
      }
    })()

    // 清理函数
    return () => {
      destroyed = true
      // 组件卸载时销毁 SDK
      if (sdkRef) {
        sdkRef.destroy()
      }
    }
  }, [])

  return <>{children}</>
}
