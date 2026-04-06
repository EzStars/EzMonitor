import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface PerfLog {
  id: number
  kind: 'long-task' | 'metrics' | 'observer' | 'cls'
  title: string
  detail: string
  payload: unknown
}

export default function PerformancePage() {
  const { status, trackEvent } = useMonitorSDK()
  const [duration, setDuration] = useState<number | null>(null)
  const [showClsBanner, setShowClsBanner] = useState(false)
  const [logs, setLogs] = useState<PerfLog[]>([])

  const pushLog = (kind: PerfLog['kind'], title: string, detail: string, payload: unknown) => {
    setLogs(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        kind,
        title,
        detail,
        payload,
      },
      ...prev,
    ])
  }

  const busyWait = (ms: number) => {
    const start = performance.now()
    while (performance.now() - start < ms) {
      // 模拟主线程阻塞，便于人工触发 long task。
    }

    return Number((performance.now() - start).toFixed(2))
  }

  const emitLongTask = async (title: string, ms: number, source: string) => {
    const cost = busyWait(ms)
    setDuration(cost)
    const payload = await trackEvent('performance_long_task', {
      duration: cost,
      threshold: 50,
      source,
      page: '/performance',
      observed: cost >= 50,
    })
    pushLog('long-task', title, `阻塞耗时 ${cost}ms`, payload ?? { duration: cost, source })
  }

  const collectNavigationMetrics = async () => {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const fallbackTiming = performance.timing
    const metrics = navigationEntry
      ? {
          type: navigationEntry.type,
          startTime: navigationEntry.startTime,
          domContentLoaded: Number((navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime).toFixed(2)),
          load: Number((navigationEntry.loadEventEnd - navigationEntry.startTime).toFixed(2)),
          responseStart: Number((navigationEntry.responseStart - navigationEntry.startTime).toFixed(2)),
          transferSize: navigationEntry.transferSize,
        }
      : {
          type: 'legacy-timing',
          domContentLoaded: fallbackTiming.domContentLoadedEventEnd - fallbackTiming.navigationStart,
          load: fallbackTiming.loadEventEnd - fallbackTiming.navigationStart,
          responseStart: fallbackTiming.responseStart - fallbackTiming.navigationStart,
          transferSize: 'n/a',
        }

    const payload = await trackEvent('performance_navigation', {
      page: '/performance',
      metrics,
    })
    pushLog('metrics', '导航性能指标', '采集 Navigation Timing / legacy timing 数据', payload ?? metrics)
  }

  const collectResourceSummary = async () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const summary = {
      total: resources.length,
      initiatorTypes: resources.reduce<Record<string, number>>((acc, item) => {
        const key = item.initiatorType || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      samples: resources.slice(0, 5).map(item => ({
        name: item.name,
        initiatorType: item.initiatorType,
        duration: Number(item.duration.toFixed(2)),
        transferSize: item.transferSize,
      })),
    }

    const payload = await trackEvent('performance_resource_summary', {
      page: '/performance',
      metrics: summary,
    })
    pushLog('metrics', '资源概览', '采集 Resource Timing 概览', payload ?? summary)
  }

  const collectUserTiming = async () => {
    const markStart = 'monitor-test-user-timing-start'
    const markEnd = 'monitor-test-user-timing-end'
    const measureName = 'monitor-test-user-timing'

    performance.mark(markStart)
    const workCost = busyWait(72)
    performance.mark(markEnd)
    performance.measure(measureName, markStart, markEnd)

    const measure = performance.getEntriesByName(measureName, 'measure').at(-1) as PerformanceMeasure | undefined
    const metrics = {
      measureName,
      duration: Number((measure?.duration ?? workCost).toFixed(2)),
      startTime: Number((measure?.startTime ?? 0).toFixed(2)),
      workCost,
    }

    performance.clearMarks(markStart)
    performance.clearMarks(markEnd)
    performance.clearMeasures(measureName)

    const payload = await trackEvent('performance_user_timing', {
      page: '/performance',
      metrics,
    })
    pushLog('metrics', '用户自定义计时', '通过 performance.mark / measure 采样', payload ?? metrics)
  }

  const observeLongTask = async () => {
    if (typeof PerformanceObserver === 'undefined') {
      pushLog('observer', 'Long Task 观察', '当前浏览器不支持 PerformanceObserver', { supported: false })
      return
    }

    const entries: PerformanceEntry[] = []
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries())
    })

    try {
      observer.observe({ type: 'longtask', buffered: true })
      const cost = busyWait(180)
      await new Promise(resolve => window.setTimeout(resolve, 60))
      observer.disconnect()

      const metrics = {
        supported: true,
        observedCount: entries.length,
        observedEntries: entries.map(item => ({
          name: item.name,
          entryType: item.entryType,
          duration: Number(item.duration.toFixed(2)),
          startTime: Number(item.startTime.toFixed(2)),
        })),
        simulatedCost: cost,
      }
      const payload = await trackEvent('performance_observed_longtask', {
        page: '/performance',
        metrics,
      })
      setDuration(cost)
      pushLog('observer', 'Long Task 观察', '已触发并采集到 longtask 观测数据', payload ?? metrics)
    }
    catch (error) {
      observer.disconnect()
      pushLog('observer', 'Long Task 观察失败', String(error), { supported: true, error: String(error) })
    }
  }

  const triggerClsShift = async () => {
    if (typeof PerformanceObserver === 'undefined') {
      pushLog('cls', 'CLS 观察', '当前浏览器不支持 PerformanceObserver', { supported: false })
      return
    }

    const entries: PerformanceEntry[] = []
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries())
    })

    try {
      observer.observe({ type: 'layout-shift', buffered: true })
      pushLog('cls', 'CLS 触发准备', '将在 1200ms 后展开顶部横幅，制造无 recent input 的布局位移', {
        supported: true,
        scheduled: true,
      })

      await new Promise(resolve => window.setTimeout(resolve, 1200))
      setShowClsBanner(true)
      await new Promise(resolve => window.setTimeout(resolve, 200))

      observer.disconnect()

      const layoutShifts = entries.filter((item) => {
        const shiftEntry = item as PerformanceEntry & { hadRecentInput?: boolean }
        return shiftEntry.entryType === 'layout-shift' && shiftEntry.hadRecentInput === false
      })
      const totalValue = layoutShifts.reduce((sum, item) => {
        const shiftEntry = item as PerformanceEntry & { value?: number }
        return sum + (shiftEntry.value ?? 0)
      }, 0)

      const metrics = {
        supported: true,
        observedCount: layoutShifts.length,
        totalValue: Number(totalValue.toFixed(3)),
        observedEntries: layoutShifts.map((item) => {
          const shiftEntry = item as PerformanceEntry & { value?: number, startTime: number, hadRecentInput?: boolean }
          return {
            entryType: shiftEntry.entryType,
            value: Number((shiftEntry.value ?? 0).toFixed(3)),
            startTime: Number(shiftEntry.startTime.toFixed(2)),
            hadRecentInput: shiftEntry.hadRecentInput ?? false,
          }
        }),
      }
      pushLog('cls', 'CLS 观察', '已展开顶部横幅并采集 layout-shift 数据，刷新或切换页面后会由 PerformancePlugin 上报 performance_cls', metrics)
    }
    catch (error) {
      observer.disconnect()
      pushLog('cls', 'CLS 观察失败', String(error), { supported: true, error: String(error) })
    }
  }

  const metricCases = [
    { title: '轻量 Long Task (80ms)', run: () => emitLongTask('轻量 Long Task', 80, 'light-blocking-work') },
    { title: '标准 Long Task (180ms)', run: () => emitLongTask('标准 Long Task', 180, 'standard-blocking-work') },
    { title: '观测 Long Task', run: observeLongTask },
    { title: '触发 CLS 变化', run: triggerClsShift },
    { title: '导航指标采集', run: collectNavigationMetrics },
    { title: '资源概览采集', run: collectResourceSummary },
    { title: '用户计时采集', run: collectUserTiming },
  ] as const

  return (
    <section className="page-card">
      <h2>性能测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p>提供 long task、Navigation Timing、Resource Timing 与 User Timing 的多场景触发。</p>

      <div
        aria-hidden="true"
        style={{
          height: showClsBanner ? 72 : 0,
          overflow: 'hidden',
          margin: showClsBanner ? '0 0 16px' : '0',
          transition: 'none',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'linear-gradient(90deg, #fff7e6 0%, #ffe58f 100%)',
            border: '1px solid #ffd666',
            color: '#7a4a00',
            fontWeight: 600,
          }}
        >
          这是一条延迟展开的顶部横幅，会推动下面内容整体下移，用于验证 CLS 采集。
        </div>
      </div>

      <div className="button-grid">
        {metricCases.map(item => (
          <button key={item.title} onClick={() => void item.run()}>
            {item.title}
          </button>
        ))}
      </div>

      <div className="detail-grid">
        <article className="detail-card">
          <h3>最近一次阻塞耗时</h3>
          <p className={duration && duration >= 50 ? 'warn' : 'muted'}>
            {duration === null ? '未触发' : `${duration}ms`}
          </p>
        </article>
        <article className="detail-card">
          <h3>采样说明</h3>
          <p className="muted">当前页面保留手动采样示例，同时 SDK 已自动接入 PerformancePlugin。CLS case 只负责制造布局位移，真正的 performance_cls 会在页面隐藏或刷新后由插件上报。</p>
        </article>
      </div>

      <h3>性能回显</h3>
      <div className="log-list">
        {logs.length === 0 ? <p className="muted">还没有触发性能事件</p> : null}
        {logs.map(item => (
          <div key={item.id} className="log-item">
            <div className="log-meta">
              <strong>{item.kind}</strong>
              <span>{item.title}</span>
              <span className="muted">{item.detail}</span>
            </div>
            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  )
}
