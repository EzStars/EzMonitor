import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface ErrorLog {
  id: number
  title: string
  detail: string
}

export default function ErrorPage() {
  const { status, trackEvent } = useMonitorSDK()
  const [logs, setLogs] = useState<ErrorLog[]>([])

  const pushLog = (title: string, detail: string) => {
    setLogs(prev => [{ id: Date.now() + Math.floor(Math.random() * 1000), title, detail }, ...prev])
  }

  const triggerJSError = () => {
    try {
      throw new Error('manual js error from error page')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      pushLog('JS Error', message)
      void trackEvent('error_js', { message, page: '/error' })
    }
  }

  const triggerPromiseError = () => {
    void Promise.reject(new Error('manual promise rejection from error page'))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        pushLog('Promise Error', message)
        void trackEvent('error_promise', { message, page: '/error' })
      })
  }

  const triggerResourceError = () => {
    const img = new Image()
    img.onerror = () => {
      const message = 'resource load failed: /not-found-monitor-resource.png'
      pushLog('Resource Error', message)
      void trackEvent('error_resource', { message, page: '/error' })
    }
    img.src = '/not-found-monitor-resource.png'
  }

  return (
    <section className="page-card">
      <h2>错误测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p>用于手动触发错误场景并验证错误事件回显与埋点上报。</p>

      <div className="control-row">
        <button onClick={triggerJSError}>触发 JS 错误</button>
        <button onClick={triggerPromiseError}>触发 Promise 错误</button>
        <button onClick={triggerResourceError}>触发资源错误</button>
      </div>

      <div className="log-list">
        {logs.length === 0 ? <p className="muted">还没有触发错误</p> : null}
        {logs.map(item => (
          <div key={item.id} className="log-item">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
