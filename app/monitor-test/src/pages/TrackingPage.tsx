import { useState } from 'react'
import { useMonitorSDK } from '../hooks/useMonitorSDK'

interface Log {
  id: number
  type: 'event' | 'page' | 'user'
  payload: unknown
}

export default function TrackingPage() {
  const { status, trackEvent, trackPage, trackUser } = useMonitorSDK()
  const [eventName, setEventName] = useState('portal_button_click')
  const [userId, setUserId] = useState('user_1001')
  const [pagePath, setPagePath] = useState('/tracking/manual-page')
  const [logs, setLogs] = useState<Log[]>([])

  const addLog = (type: Log['type'], payload: unknown) => {
    setLogs(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        payload,
      },
      ...prev,
    ])
  }

  return (
    <section className="page-card">
      <h2>TrackingPlugin 测试页</h2>
      <p className="muted">
        SDK 状态：
        {status}
      </p>

      <div className="control-row">
        <input value={eventName} onChange={e => setEventName(e.target.value)} aria-label="event-name" />
        <button
          onClick={() => {
            void trackEvent(eventName, { source: 'tracking-page', at: new Date().toISOString() })
              .then(payload => addLog('event', payload))
          }}
        >
          触发 track
        </button>
      </div>

      <div className="control-row">
        <input value={pagePath} onChange={e => setPagePath(e.target.value)} aria-label="page-path" />
        <button
          onClick={() => {
            void trackPage(pagePath, { from: 'manual-page-input' })
              .then(payload => addLog('page', payload))
          }}
        >
          触发 trackPage
        </button>
      </div>

      <div className="control-row">
        <input value={userId} onChange={e => setUserId(e.target.value)} aria-label="user-id" />
        <button
          onClick={() => {
            void trackUser(userId, { role: 'tester' })
              .then(payload => addLog('user', payload))
          }}
        >
          触发 trackUser
        </button>
      </div>

      <h3>事件回显</h3>
      <div className="log-list">
        {logs.length === 0 ? <p className="muted">还没有触发事件</p> : null}
        {logs.map(item => (
          <div key={item.id} className="log-item">
            <strong>{item.type}</strong>
            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
          </div>
        ))}
      </div>
    </section>
  )
}
