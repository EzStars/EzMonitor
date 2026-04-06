import { useEffect, useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface ErrorLog {
  id: number
  kind: 'sync' | 'promise' | 'resource' | 'network' | 'listener'
  title: string
  detail: string
  payload: unknown
}

export default function ErrorPage() {
  const { status, reportError } = useMonitorSDK()
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

  useEffect(() => {
    const onError = async (event: Event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement
        const detail = {
          tagName: target.tagName,
          src: target instanceof HTMLImageElement || target instanceof HTMLScriptElement ? target.src : undefined,
          href: target instanceof HTMLLinkElement ? target.href : undefined,
        }
        await reportError('resource', {
          message: `${target.tagName.toLowerCase()} load failed`,
          url: detail.src ?? detail.href ?? window.location.href,
          detail,
        })
        pushLog('resource', '资源加载错误已捕获', 'window error 捕获到资源错误', detail)
        return
      }

      const errorEvent = event as ErrorEvent
      const payload = {
        message: errorEvent.message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno,
        stack: errorEvent.error instanceof Error ? errorEvent.error.stack : undefined,
      }
      await reportError('js', {
        message: payload.message || 'JavaScript runtime error',
        url: errorEvent.filename || window.location.href,
        stack: payload.stack,
        detail: {
          filename: payload.filename,
          lineno: payload.lineno,
          colno: payload.colno,
        },
      })
      pushLog('listener', '同步 JS 错误已捕获', 'window.onerror 捕获到同步错误', payload)
    }

    const onUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const payload = {
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
      }
      await reportError('promise', {
        message: payload.message,
        url: window.location.href,
        stack: payload.stack,
      })
      pushLog('promise', 'Promise rejection 已捕获', 'unhandledrejection 捕获到 Promise rejection', payload)
    }

    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [reportError])

  const triggerCaughtSyncError = async () => {
    try {
      throw new Error('caught sync error from error page')
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      const payload = { message, handled: true }
      await reportError('js_caught', {
        message,
        stack,
        detail: { handled: true, page: '/error' },
      })
      pushLog('sync', '已捕获同步错误', message, payload)
    }
  }

  const triggerUnhandledSyncError = () => {
    window.setTimeout(() => {
      throw new Error('unhandled sync error from error page')
    }, 0)
    pushLog('sync', '未捕获同步错误', '已安排一个 setTimeout throw，稍后会被 window.onerror 捕获', {
      scheduled: true,
      page: '/error',
    })
  }

  const triggerPromiseError = () => {
    Promise.reject(new Error('unhandled promise rejection from error page'))
    pushLog('promise', '未捕获 Promise rejection', '已触发一个未处理的 Promise rejection', {
      scheduled: true,
      page: '/error',
    })
  }

  const triggerImageResourceError = () => {
    const img = new Image()
    img.src = '/not-found-monitor-resource.png'
    pushLog('resource', '图片资源错误', '已挂载一个不存在的图片地址', {
      element: 'img',
      src: img.src,
      page: '/error',
    })
  }

  const triggerScriptResourceError = () => {
    const script = document.createElement('script')
    script.src = '/not-found-monitor-script.js'
    document.body.appendChild(script)
    pushLog('resource', '脚本资源错误', '已挂载一个不存在的脚本地址', {
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
      <p>用于手动触发同步错误、Promise rejection、网络失败、资源错误，并在页面内保留清晰回显。</p>

      <div className="button-grid">
        <button onClick={() => void triggerCaughtSyncError()}>触发已捕获同步错误</button>
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
