export interface TrackingEventData {
  eventName: string
  properties?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  userId?: string
  appId?: string
}

export interface TrackingPageData {
  page: string
  properties?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  userId?: string
  appId?: string
}

export interface TrackingUserData {
  userId: string
  properties?: Record<string, unknown>
  timestamp: number
  sessionId?: string
  appId?: string
}

export interface TrackingPluginConfig {
  autoTrackPage?: boolean
  eventFilter?: (eventName: string, properties?: Record<string, unknown>) => boolean
}
