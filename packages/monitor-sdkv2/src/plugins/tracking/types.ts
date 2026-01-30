/**
 * 埋点事件数据结构
 */
export interface TrackingEventData {
  /** 事件名称 */
  eventName: string
  /** 事件属性 */
  properties?: Record<string, any>
  /** 上下文信息 */
  context?: Record<string, any>
  /** 时间戳 */
  timestamp?: number
  /** 会话ID */
  sessionId?: string
  /** 用户ID */
  userId?: string
  /** 应用ID */
  appId?: string
}

/**
 * 页面埋点数据结构
 */
export interface TrackingPageData {
  /** 页面名称或路径 */
  page: string
  /** 页面属性 */
  properties?: Record<string, any>
  /** 上下文信息 */
  context?: Record<string, any>
  /** 时间戳 */
  timestamp?: number
  /** 会话ID */
  sessionId?: string
  /** 用户ID */
  userId?: string
  /** 应用ID */
  appId?: string
}

/**
 * 用户埋点数据结构
 */
export interface TrackingUserData {
  /** 用户ID */
  userId: string
  /** 用户属性 */
  properties?: Record<string, any>
  /** 时间戳 */
  timestamp?: number
  /** 会话ID */
  sessionId?: string
  /** 应用ID */
  appId?: string
}

/**
 * 自定义埋点插件配置
 */
export interface TrackingPluginConfig {
  /** 是否启用自动页面埋点 */
  autoTrackPage?: boolean
  /** 自定义数据处理器 */
  dataProcessor?: (
    data: TrackingEventData | TrackingPageData | TrackingUserData,
  ) => any
  /** 自定义过滤器 */
  eventFilter?: (
    eventName: string,
    properties?: Record<string, any>,
  ) => boolean
}

/**
 * 埋点上下文信息
 */
export interface TrackingContext {
  /** 页面信息 */
  page?: {
    url?: string
    title?: string
    referrer?: string
  }
  /** 设备信息 */
  device?: {
    userAgent?: string
    screen?: {
      width: number
      height: number
    }
    viewport?: {
      width: number
      height: number
    }
  }
  /** 网络信息 */
  network?: {
    effectiveType?: string
    downlink?: number
  }
  /** 自定义上下文 */
  custom?: Record<string, any>
}
