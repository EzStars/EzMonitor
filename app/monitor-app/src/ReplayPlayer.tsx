import { Alert, Empty } from 'antd'
import { useEffect, useRef, useState } from 'react'
import 'rrweb-player/dist/style.css'

interface ReplayPlayerProps {
  events?: Array<Record<string, unknown>>
}

function toRrwebEvent(
  value: Record<string, unknown>,
  fallbackTimestamp?: unknown,
): Record<string, unknown> | null {
  const timestamp = value.timestamp
  const type = value.type
  const nextTimestamp = typeof timestamp === 'number'
    ? timestamp
    : (typeof fallbackTimestamp === 'number' ? fallbackTimestamp : undefined)

  if (typeof nextTimestamp !== 'number' || typeof type !== 'number') {
    return null
  }

  return {
    ...value,
    timestamp: nextTimestamp,
  }
}

function normalizeEvents(input?: Array<Record<string, unknown>>) {
  if (!input || input.length === 0) {
    return [] as Array<Record<string, unknown>>
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const directEvent = toRrwebEvent(item)
      if (directEvent) {
        return directEvent
      }

      const wrapper = item as { at?: unknown, data?: unknown }
      if (wrapper.data && typeof wrapper.data === 'object') {
        return toRrwebEvent(wrapper.data as Record<string, unknown>, wrapper.at)
      }

      return null
    })
    .filter((item): item is Record<string, unknown> => item !== null)
}

export default function ReplayPlayer({ events }: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const normalizedEvents = normalizeEvents(events)
  const hasRawEvents = Array.isArray(events) && events.length > 0
  const hasFullSnapshot = normalizedEvents.some(item => item.type === 2)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    container.innerHTML = ''
    setInitError(null)
    if (normalizedEvents.length === 0) {
      return
    }

    let destroyed = false

    const resolvePlayerCtor = async () => {
      const candidates = [
        () => import('rrweb-player'),
        () => import('rrweb-player/dist/index.js'),
      ]

      let lastError: unknown = null
      for (const load of candidates) {
        try {
          const mod = await load()
          const ctor = (mod as { default?: unknown }).default ?? mod
          if (typeof ctor === 'function') {
            return ctor as new (args: {
              target: Element
              props: {
                events: any[]
                autoPlay: boolean
                width: number
                height: number
              }
            }) => unknown
          }
        }
        catch (error) {
          lastError = error
        }
      }

      throw lastError ?? new Error('无法加载 rrweb-player 构造器')
    }

    void resolvePlayerCtor()
      .then((RRWebPlayer) => {
        if (destroyed || !containerRef.current) {
          return
        }

        // eslint-disable-next-line no-new
        new RRWebPlayer({
          target: containerRef.current,
          props: {
            events: normalizedEvents as unknown as any[],
            autoPlay: false,
            width: 860,
            height: 460,
          },
        })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (!destroyed && containerRef.current) {
          setInitError(message)
        }
      })

    return () => {
      destroyed = true
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [normalizedEvents])

  if (normalizedEvents.length === 0) {
    if (hasRawEvents) {
      return <Alert type="warning" showIcon message="当前分段不是 rrweb 事件，无法播放" />
    }

    return <Empty description="当前分段没有可播放 rrweb 事件" />
  }

  if (initError) {
    return <Alert type="error" showIcon message={`播放器初始化失败：${initError}`} />
  }

  if (!hasFullSnapshot) {
    return <Alert type="warning" showIcon message="当前回放缺少 FullSnapshot，无法还原页面画面" />
  }

  return <div ref={containerRef} style={{ overflowX: 'auto' }} />
}
