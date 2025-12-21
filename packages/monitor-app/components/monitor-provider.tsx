'use client';

import { useEffect } from 'react';
import { initMonitorSDK } from '@/lib/monitor';

/**
 * Monitor SDK Provider
 * 用于在客户端初始化监控 SDK
 */
export function MonitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 在客户端初始化 SDK
    const sdk = initMonitorSDK();

    if (sdk) {
      console.log('[MonitorProvider] SDK 初始化完成', {
        status: sdk.getStatus(),
        sessionId: sdk.getSessionId(),
      });
    }

    // 清理函数
    return () => {
      // 组件卸载时销毁 SDK
      if (sdk) {
        sdk.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
