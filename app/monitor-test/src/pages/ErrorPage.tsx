import { useCallback, useEffect, useRef, useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'
import { collectWhiteScreenSnapshot } from '../services/reliability'

interface ErrorLog {
  id: number
  kind: 'sync' | 'promise' | 'resource' | 'network' | 'listener' | 'offline' | 'white-screen'
  title: string
  detail: string
  payload: unknown
}

const WHITE_SCREEN_WINDOW_MS = 6000
const WHITE_SCREEN_INTERVAL_MS = 1000
const WHITE_SCREEN_THRESHOLD = 0.95
const ROOT_SELECTORS = ['#root', '.portal-shell']
const SKELETON_SELECTORS = ['.skeleton', '.loading', '[data-skeleton]']

export default function ErrorPage() {
  const {
    status,
    flushReportQueue,
    getReportQueueStorageKey,
    readPersistedReportQueue,
    reportError,
    trackEvent,
  } = useMonitorSDK()
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [queueInfo, setQueueInfo] = useState(() => readPersistedReportQueue())
  const [isWhiteMaskVisible, setIsWhiteMaskVisible] = useState(false)
  const [whiteScreenMonitoring, setWhiteScreenMonitoring] = useState(false)
  const whiteScreenTimerRef = useRef<number | null>(null)
  const whiteScreenStartedAtRef = useRef<number | null>(null)
  const whiteScreenCheckingRef = useRef(false)

  const pushLog = useCallback((kind: ErrorLog['kind'], title: string, detail: string, payload: unknown) => {
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
  }, [])

  const refreshQueueInfo = useCallback(() => {
    setQueueInfo(readPersistedReportQueue())
  }, [readPersistedReportQueue])

  const triggerCaughtSyncError = () => {
    try {
      throw new Error('caught sync error from error page')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const payload = { message, handled: true }
      pushLog('sync', '已捕获同步错误', `${message}（已捕获错误默认不会被自动监听上报）`, payload)
    }
  }

  const triggerUnhandledSyncError = () => {
    window.setTimeout(() => {
      throw new Error('unhandled sync error from error page')
    }, 0)
    pushLog('sync', '未捕获同步错误', '已安排一个 setTimeout throw，SDK ErrorPlugin 会自动监听并上报', {
      scheduled: true,
      page: '/error',
    })
  }

  const triggerPromiseError = () => {
    Promise.reject(new Error('unhandled promise rejection from error page'))
    pushLog('promise', '未捕获 Promise rejection', '已触发一个未处理的 Promise rejection，SDK ErrorPlugin 会自动监听并上报', {
      scheduled: true,
      page: '/error',
    })
  }

  const triggerImageResourceError = () => {
    const img = new Image()
    img.src = '/not-found-monitor-resource.png'
    pushLog('resource', '图片资源错误', '已挂载一个不存在的图片地址，SDK ErrorPlugin 会自动监听并上报', {
      element: 'img',
      src: img.src,
      page: '/error',
    })
  }

  const triggerScriptResourceError = () => {
    const script = document.createElement('script')
    script.src = '/not-found-monitor-script.js'
    document.body.appendChild(script)
    pushLog('resource', '脚本资源错误', '已挂载一个不存在的脚本地址，SDK ErrorPlugin 会自动监听并上报', {
      element: 'script',
      src: script.src,
      page: '/error',
    })
  }

  const triggerNetworkError = async () => {
    try {
      await fetch('http://127.0.0.1:65535/__monitor_network_failure__', { mode: 'cors' })
    }
    catch (error) {
      pushLog('network', '网络请求失败', '已模拟一个不可达接口请求', {
        page: '/error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const enqueueOfflineProbe = async () => {
    const payload = await trackEvent('reliability_offline_probe', {
      page: '/error',
      hint: 'disconnect-network-and-click',
      online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      happenedAt: new Date().toISOString(),
    })
    refreshQueueInfo()
    pushLog('offline', '离线恢复-写入队列', '已发送离线探针事件，断网状态下将进入本地队列', payload)
  }

  const flushOfflineQueue = async () => {
    await flushReportQueue()
    refreshQueueInfo()
    pushLog('offline', '离线恢复-手动刷新', '已执行 Reporter.flush()，联网后应看到队列减少', {
      online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      queue: readPersistedReportQueue(),
    })
  }

  const runWhiteScreenCheck = async () => {
    if (whiteScreenCheckingRef.current) {
      return
    }
    whiteScreenCheckingRef.current = true

    try {
      const snapshot = collectWhiteScreenSnapshot(ROOT_SELECTORS, SKELETON_SELECTORS)
      const isPotentialWhiteScreen = snapshot.ratio >= WHITE_SCREEN_THRESHOLD
      if (!isPotentialWhiteScreen) {
        whiteScreenStartedAtRef.current = null
        pushLog('white-screen', '白屏检测采样', '当前页面存在内容，未命中白屏阈值', snapshot)
        return
      }

      if (whiteScreenStartedAtRef.current === null) {
        whiteScreenStartedAtRef.current = Date.now()
        pushLog('white-screen', '白屏检测采样', '首次命中潜在白屏阈值，进入持续观察', snapshot)
        return
      }

      const duration = Date.now() - whiteScreenStartedAtRef.current
      if (duration < WHITE_SCREEN_WINDOW_MS) {
        pushLog('white-screen', '白屏检测采样', `持续命中 ${duration}ms，尚未达到 ${WHITE_SCREEN_WINDOW_MS}ms 上报阈值`, snapshot)
        return
      }

      await reportError('white_screen', {
        message: 'Potential white screen detected in monitor-test',
        detail: {
          duration,
          thresholdRatio: WHITE_SCREEN_THRESHOLD,
          sample: snapshot,
        },
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      })
      whiteScreenStartedAtRef.current = null
      pushLog('white-screen', '白屏检测上报', `已达到 ${WHITE_SCREEN_WINDOW_MS}ms 阈值并完成 error_white_screen 上报`, snapshot)
    }
    finally {
      whiteScreenCheckingRef.current = false
    }
  }

  const startWhiteScreenMonitoring = () => {
    if (whiteScreenTimerRef.current !== null) {
      return
    }

    setWhiteScreenMonitoring(true)
    whiteScreenTimerRef.current = window.setInterval(() => {
      void runWhiteScreenCheck()
    }, WHITE_SCREEN_INTERVAL_MS)
    pushLog('white-screen', '白屏检测启动', '每 1s 采样一次，连续 6s 命中才会上报', {
      intervalMs: WHITE_SCREEN_INTERVAL_MS,
      thresholdMs: WHITE_SCREEN_WINDOW_MS,
      thresholdRatio: WHITE_SCREEN_THRESHOLD,
    })
  }

  const stopWhiteScreenMonitoring = () => {
    if (whiteScreenTimerRef.current !== null) {
      window.clearInterval(whiteScreenTimerRef.current)
      whiteScreenTimerRef.current = null
    }
    whiteScreenStartedAtRef.current = null
    setWhiteScreenMonitoring(false)
    pushLog('white-screen', '白屏检测停止', '已停止周期采样', {})
  }

  const showWhiteMask = async () => {
    setIsWhiteMaskVisible(true)
    pushLog('white-screen', '白屏模拟开始', '已显示 7 秒白屏遮罩，可用于触发自动检测', { durationMs: 7000 })
    await new Promise(resolve => window.setTimeout(resolve, 7000))
    setIsWhiteMaskVisible(false)
    pushLog('white-screen', '白屏模拟结束', '白屏遮罩已移除', {})
  }

  useEffect(() => {
    const handleOnline = () => {
      void flushReportQueue().then(() => {
        refreshQueueInfo()
        pushLog('offline', '网络恢复自动刷新', '检测到 online 事件，已自动尝试重发本地队列', {
          queue: readPersistedReportQueue(),
        })
      })
    }
    const handleOffline = () => {
      refreshQueueInfo()
      pushLog('offline', '网络断开', '检测到 offline 事件，可先触发离线探针再恢复联网验证重传', {})
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (whiteScreenTimerRef.current !== null) {
        window.clearInterval(whiteScreenTimerRef.current)
      }
    }
  }, [flushReportQueue, pushLog, readPersistedReportQueue, refreshQueueInfo])

  return (
    <section className="page-card">
      <h2>错误测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p>用于触发同步错误、Promise rejection、网络失败、资源错误；同时补充离线恢复上传与白屏检测验证。</p>

      <div className="button-grid">
        <button onClick={triggerCaughtSyncError}>触发已捕获同步错误</button>
        <button onClick={triggerUnhandledSyncError}>触发未捕获同步错误</button>
        <button onClick={triggerPromiseError}>触发 Promise 错误</button>
        <button onClick={() => void triggerNetworkError()}>触发网络失败</button>
        <button onClick={triggerImageResourceError}>触发图片资源错误</button>
        <button onClick={triggerScriptResourceError}>触发脚本资源错误</button>
      </div>

      <h3>离线恢复上传验证</h3>
      <p className="muted">
        本地队列 Key：
        {getReportQueueStorageKey()}
      </p>
      <p className="muted">
        当前网络：
        {typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'}
        {' '}
        ｜本地队列条数：
        {queueInfo.itemCount}
      </p>
      <p className="muted">
        最近持久化时间：
        {queueInfo.savedAt ? new Date(queueInfo.savedAt).toLocaleTimeString() : '无'}
        {' '}
        ｜样本类型：
        {queueInfo.sampleTypes.length > 0 ? queueInfo.sampleTypes.join(', ') : '无'}
      </p>
      <div className="button-grid">
        <button onClick={() => void enqueueOfflineProbe()}>发送离线探针事件</button>
        <button onClick={() => void flushOfflineQueue()}>手动刷新离线队列</button>
        <button onClick={refreshQueueInfo}>刷新本地队列快照</button>
      </div>

      <h3>白屏检测验证</h3>
      <p className="muted">
        规则：每 1 秒采样 18 个点，容器命中率 ≥
        {' '}
        {WHITE_SCREEN_THRESHOLD}
        {' '}
        且持续 6 秒，上报 error_white_screen。
      </p>
      <div className="button-grid">
        <button onClick={startWhiteScreenMonitoring} disabled={whiteScreenMonitoring}>启动白屏检测</button>
        <button onClick={stopWhiteScreenMonitoring} disabled={!whiteScreenMonitoring}>停止白屏检测</button>
        <button onClick={() => void showWhiteMask()}>显示 7 秒白屏遮罩</button>
        <button onClick={() => void runWhiteScreenCheck()}>立即采样一次</button>
      </div>

      {isWhiteMaskVisible
        ? (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#fff',
              }}
            />
          )
        : null}

      <div className="log-list">
        {logs.length === 0 ? <p className="muted">还没有触发错误</p> : null}
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
