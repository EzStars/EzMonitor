import type { AlertEventRecord } from '../services/monitor'
import { useEffect, useMemo, useState } from 'react'
import { monitorService } from '../services/monitor'

export type AlertStreamStatus = 'connecting' | 'connected' | 'degraded'

function normalizeAlert(value: unknown): AlertEventRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Record<string, unknown>
  if (typeof item.ruleName !== 'string' || typeof item.summary !== 'string') {
    return null
  }

  return {
    _id: typeof item.id === 'string' ? item.id : undefined,
    ruleId: typeof item.ruleId === 'string' ? item.ruleId : undefined,
    ruleName: item.ruleName,
    appId: typeof item.appId === 'string' ? item.appId : undefined,
    metric: (item.metric === 'error_spread' ? 'error_spread' : 'error_frequency'),
    severity: item.severity === 'critical' || item.severity === 'high' || item.severity === 'medium' ? item.severity : 'low',
    score: typeof item.score === 'number' ? item.score : 0,
    summary: item.summary,
    findings: Array.isArray(item.findings) ? item.findings.filter(part => typeof part === 'string') as string[] : [],
    suppressionHits: typeof item.suppressionHits === 'number' ? item.suppressionHits : 0,
    status: item.status === 'acknowledged' || item.status === 'resolved' ? item.status : 'open',
    triggeredAt: typeof item.triggeredAt === 'string' ? item.triggeredAt : new Date().toISOString(),
  }
}

export function mergeAlerts(
  current: AlertEventRecord[],
  incoming: AlertEventRecord[],
  limit: number,
): AlertEventRecord[] {
  const byId = new Map<string, AlertEventRecord>()

  for (const item of [...incoming, ...current]) {
    const key = item._id ?? `${item.ruleName}:${item.summary}:${new Date(item.triggeredAt).getTime()}`
    if (!byId.has(key)) {
      byId.set(key, item)
    }
  }

  return [...byId.values()]
    .sort((a, b) => +new Date(b.triggeredAt) - +new Date(a.triggeredAt))
    .slice(0, Math.max(1, limit))
}

export function useAlertStream(appId?: string, limit = 20) {
  const [alerts, setAlerts] = useState<AlertEventRecord[]>([])
  const [status, setStatus] = useState<AlertStreamStatus>('connecting')

  useEffect(() => {
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let pollTimer: ReturnType<typeof setInterval> | undefined
    let source: EventSource | undefined

    const loadLatest = async () => {
      try {
        const latest = await monitorService.getLatestAlerts({ appId, limit })
        if (!disposed) {
          setAlerts(prev => mergeAlerts(prev, latest, limit))
        }
      }
      catch {
        // keep latest state on polling failure
      }
    }

    const startPolling = () => {
      if (pollTimer) {
        return
      }

      void loadLatest()
      pollTimer = setInterval(() => {
        void loadLatest()
      }, 15000)
    }

    const stopPolling = () => {
      if (!pollTimer) {
        return
      }

      clearInterval(pollTimer)
      pollTimer = undefined
    }

    const connect = () => {
      if (disposed) {
        return
      }

      if (typeof EventSource === 'undefined') {
        setStatus('degraded')
        startPolling()
        return
      }

      const params = new URLSearchParams()
      if (appId) {
        params.set('appId', appId)
      }

      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      source = new EventSource(`${baseUrl}/api/monitor/events/stream?${params.toString()}`)

      source.onopen = () => {
        if (disposed) {
          return
        }

        setStatus('connected')
        stopPolling()
      }

      source.addEventListener('alert', (event) => {
        if (disposed) {
          return
        }

        try {
          const parsed = normalizeAlert(JSON.parse((event as MessageEvent).data))
          if (!parsed) {
            return
          }

          setAlerts(prev => mergeAlerts(prev, [parsed], limit))
        }
        catch {
          // ignore malformed stream payload
        }
      })

      source.onerror = () => {
        if (disposed) {
          return
        }

        setStatus('degraded')
        startPolling()
        source?.close()
        retryTimer = setTimeout(connect, 5000)
      }
    }

    void loadLatest()
    connect()

    return () => {
      disposed = true
      source?.close()
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      if (pollTimer) {
        clearInterval(pollTimer)
      }
    }
  }, [appId, limit])

  return useMemo(() => ({
    alerts,
    status,
  }), [alerts, status])
}
