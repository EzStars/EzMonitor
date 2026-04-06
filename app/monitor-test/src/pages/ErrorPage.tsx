import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface ErrorLog {
  id: number
  kind: 'sync' | 'promise' | 'resource' | 'network' | 'listener'
  title: string
  detail: string
  payload: unknown
}

export default function ErrorPage() {
  const { status } = useMonitorSDK()
  const [logs, setLogs] = useState<ErrorLog[]>([])

  const pushLog = (kind: ErrorLog['kind'], title: string, detail: string, payload: unknown) => {
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

  return (
    <section className="page-card">
      <h2>错误测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p>用于触发同步错误、Promise rejection、网络失败、资源错误；错误监听与上报由 SDK ErrorPlugin 自动处理。</p>

      <div className="button-grid">
        <button onClick={triggerCaughtSyncError}>触发已捕获同步错误</button>
        <button onClick={triggerUnhandledSyncError}>触发未捕获同步错误</button>
        <button onClick={triggerPromiseError}>触发 Promise 错误</button>
        <button onClick={() => void triggerNetworkError()}>触发网络失败</button>
        <button onClick={triggerImageResourceError}>触发图片资源错误</button>
        <button onClick={triggerScriptResourceError}>触发脚本资源错误</button>
      </div>

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
