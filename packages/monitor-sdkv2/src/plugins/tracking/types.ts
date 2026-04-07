export interface TrackingEventData {
  eventName: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  userId?: string
  appId?: string
}

export interface TrackingPageData {
  page: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  userId?: string
  appId?: string
}

export interface TrackingUserData {
  userId: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  appId?: string
}

export interface TrackingUVData {
  visitorId: string
  properties?: Record<string, unknown>
  context?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  userId?: string
  appId?: string
}

export interface TrackingPluginConfig {
  autoTrackPage?: boolean
  autoTrackRoute?: boolean
  autoTrackUv?: boolean
  trackHashRoute?: boolean
  flushOnPageHide?: boolean
  visitorIdStorageKey?: string
  uvStorageKey?: string
  visitorIdTtlDays?: number
  eventFilter?: (eventName: string, properties?: Record<string, unknown>) => boolean
}
