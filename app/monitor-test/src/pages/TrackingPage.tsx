import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface Log {
  id: number
  type: 'event' | 'page' | 'user' | 'info'
  title: string
  detail: string
  payload: unknown
}

export default function TrackingPage() {
  const { status, trackEvent, trackPage, trackUser } = useMonitorSDK()
  const location = useLocation()
  const [eventName, setEventName] = useState('portal_button_click')
  const [userId, setUserId] = useState('user_1001')
  const [pagePath, setPagePath] = useState('/tracking/manual-page')
  const [logs, setLogs] = useState<Log[]>([])
  const currentRoute = `${location.pathname}${location.search}${location.hash}`

  const addLog = (type: Log['type'], title: string, detail: string, payload: unknown) => {
    setLogs(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        title,
        detail,
        payload,
      },
      ...prev,
    ])
  }

  const runEventCase = async (title: string, eventNameToSend: string, properties: Record<string, unknown>) => {
    const payload = await trackEvent(eventNameToSend, properties)
    addLog(
      'event',
      title,
      payload ? `已上报事件 ${eventNameToSend}` : `事件 ${eventNameToSend} 被过滤`,
      payload ?? { eventName: eventNameToSend, properties, skipped: true },
    )
  }

  const runPageCase = async (title: string, page: string, properties: Record<string, unknown>) => {
    const payload = await trackPage(page, properties)
    addLog('page', title, `页面路径：${page}`, payload)
  }

  const runUserCase = async (title: string, userIdToSend: string, properties: Record<string, unknown>) => {
    const payload = await trackUser(userIdToSend, properties)
    addLog('user', title, `用户：${userIdToSend}`, payload)
  }

  const eventCases = [
    {
      title: '按钮点击',
      eventName: 'button_click',
      properties: { source: 'tracking-page', element: 'primary-cta', action: 'click' },
    },
    {
      title: '表单提交',
      eventName: 'form_submit',
      properties: { formName: 'profile-form', valid: true, fields: ['nickname', 'email'] },
    },
    {
      title: '商品浏览',
      eventName: 'product_view',
      properties: { sku: 'sku_1001', category: 'accessory', price: 99, currency: 'CNY' },
    },
  ] as const

  const pageCases = [
    {
      title: '当前路由快照',
      page: currentRoute,
      properties: { source: 'current-route', routeType: 'pathname+search+hash' },
    },
    {
      title: '带查询参数页面',
      page: '/tracking?tab=summary&from=nav',
      properties: { source: 'query-route', entry: 'navigation' },
    },
    {
      title: '带 hash 页面',
      page: '/tracking#detail-panel',
      properties: { source: 'hash-route', anchor: 'detail-panel' },
    },
  ] as const

  const userCases = [
    {
      title: '游客',
      userId: 'guest_0001',
      properties: { role: 'guest', plan: 'free', authenticated: false },
    },
    {
      title: '会员',
      userId: 'user_1001',
      properties: { role: 'member', plan: 'pro', locale: 'zh-CN' },
    },
    {
      title: '管理员',
      userId: 'admin_9001',
      properties: { role: 'admin', permissions: ['dashboard', 'tracking', 'performance'] },
    },
  ] as const

  return (
    <section className="page-card">
      <h2>TrackingPlugin 测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>
      <p className="muted">当前路由：{currentRoute}</p>

      <div className="section-title-row">
        <h3>事件埋点</h3>
        <button
          onClick={() => {
            void runEventCase('自定义事件', eventName, {
              source: 'manual-input',
              page: currentRoute,
              happenedAt: new Date().toISOString(),
            })
          }}
        >
          触发自定义 track
        </button>
      </div>
      <div className="control-row">
        <input value={eventName} onChange={e => setEventName(e.target.value)} aria-label="event-name" />
      </div>
      <div className="button-grid">
        {eventCases.map(item => (
          <button
            key={item.eventName}
            onClick={() => {
              void runEventCase(item.title, item.eventName, {
                ...item.properties,
                page: currentRoute,
              })
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="section-title-row">
        <h3>页面埋点</h3>
        <button
          onClick={() => {
            void runPageCase('手动路径', pagePath, { from: 'manual-page-input', page: currentRoute })
          }}
        >
          触发自定义 trackPage
        </button>
      </div>
      <div className="control-row">
        <input value={pagePath} onChange={e => setPagePath(e.target.value)} aria-label="page-path" />
      </div>
      <div className="button-grid">
        {pageCases.map(item => (
          <button
            key={item.title}
            onClick={() => {
              void runPageCase(item.title, item.page, item.properties)
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="section-title-row">
        <h3>用户埋点</h3>
        <button
          onClick={() => {
            void runUserCase('手动用户', userId, {
              role: 'tester',
              source: 'manual-input',
              page: currentRoute,
            })
          }}
        >
          触发自定义 trackUser
        </button>
      </div>
      <div className="control-row">
        <input value={userId} onChange={e => setUserId(e.target.value)} aria-label="user-id" />
      </div>
      <div className="button-grid">
        {userCases.map(item => (
          <button
            key={item.userId}
            onClick={() => {
              void runUserCase(item.title, item.userId, item.properties)
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <h3>事件回显</h3>
      <div className="log-list">
        {logs.length === 0 ? <p className="muted">还没有触发事件</p> : null}
        {logs.map(item => (
          <div key={item.id} className="log-item">
            <div className="log-meta">
              <strong>{item.type}</strong>
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
