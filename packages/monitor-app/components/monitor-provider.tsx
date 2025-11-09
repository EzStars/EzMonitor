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
    const result = initMonitorSDK();

    if (result) {
      console.log('[MonitorProvider] SDK 初始化完成');
    }

    // 清理函数
    return () => {
      // 如果需要，可以在这里销毁 SDK
      // result?.sdk.destroy();
    };
  }, []);

  return <>{children}</>;
}
