import type { SDKConfig } from '../../types/config'
import type { IPlugin, PluginStatus } from '../../types/plugin'
import type {
  TrackingEventData,
  TrackingPageData,
  TrackingPluginConfig,
  TrackingUserData,
} from './types'

export class TrackingPlugin implements IPlugin {
  readonly name = 'tracking'
  readonly version = '1.0.0'
  status: PluginStatus = 'registered'

  private config: SDKConfig = {}
  private pluginConfig: Required<TrackingPluginConfig> = {
    autoTrackPage: true,
    eventFilter: () => true,
  }

  constructor(config: Partial<TrackingPluginConfig> = {}) {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...config,
    }
  }

  configure(pluginConfig: Record<string, unknown>, _sdkConfig: SDKConfig): void {
    this.pluginConfig = {
      ...this.pluginConfig,
      ...(pluginConfig as Partial<TrackingPluginConfig>),
    }
  }

  init(config: SDKConfig): void {
    this.config = config
    this.status = 'initialized'
  }

  start(config: SDKConfig): void {
    this.config = config
    this.status = 'started'

    if (this.pluginConfig.autoTrackPage && typeof window !== 'undefined') {
      this.trackPage(window.location.pathname + window.location.search)
    }
  }

  stop(): void {
    this.status = 'stopped'
  }

  destroy(): void {
    this.status = 'destroyed'
  }

  track(eventName: string, properties?: Record<string, unknown>): TrackingEventData | null {
    if (!this.pluginConfig.eventFilter(eventName, properties)) {
      return null
    }

    const payload: TrackingEventData = {
      eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:event', payload)
    return payload
  }

  trackPage(page: string, properties?: Record<string, unknown>): TrackingPageData {
    const payload: TrackingPageData = {
      page,
      properties,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.userId as string | undefined,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:page', payload)
    return payload
  }

  trackUser(userId: string, properties?: Record<string, unknown>): TrackingUserData {
    const payload: TrackingUserData = {
      userId,
      properties,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      appId: this.config.appId as string | undefined,
    }

    this.report('tracking:user', payload)
    return payload
  }

  private report(type: string, data: unknown): void {
    if (!this.config.enabled) {
      return
    }

    if (this.config.debug) {
      console.warn('[TrackingPlugin]', type, data)
    }
  }
}
