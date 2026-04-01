import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

export default function PerformancePage() {
  const { status, trackEvent } = useMonitorSDK()
  const [duration, setDuration] = useState<number | null>(null)

  const simulateLongTask = () => {
    const start = performance.now()
    while (performance.now() - start < 120) {
      // Simulate main-thread blocking work for baseline performance testing.
    }

    const cost = Number((performance.now() - start).toFixed(2))
    setDuration(cost)
    void trackEvent('performance_long_task', {
      duration: cost,
      threshold: 120,
      page: '/performance',
    })
  }

  return (
    <section className="page-card">
      <h2>性能测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p>首版用于建立性能测试入口：手动触发一次 long task 并上报埋点。</p>
      <div className="control-row">
        <button onClick={simulateLongTask}>模拟 120ms Long Task</button>
      </div>
      <p className={duration && duration >= 120 ? 'warn' : 'muted'}>
        最近一次耗时：
        {duration === null ? '未触发' : `${duration}ms`}
      </p>
    </section>
  )
}
