import type { SDKConfig } from '../types/config'

export type ReportTransportType = 'beacon' | 'image' | 'xhr'

export interface ReportEnvelope {
  type: string
  payload: unknown
  timestamp: number
  sessionId?: string
  appId?: string
  userId?: string
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export interface ReporterLike {
  prepare: () => Promise<void>
  report: (type: string, payload: unknown) => void
  flush: () => Promise<void>
  start: () => Promise<void>
  stop: () => Promise<void>
  destroy: () => Promise<void>
}

export interface ITransportAdapter {
  readonly type: ReportTransportType
  isSupported: () => boolean
  send: (url: string, body: string) => Promise<void>
}

export interface ReporterOptions {
  transports?: ITransportAdapter[]
  storage?: StorageLike
  now?: () => number
}

export interface ReporterRuntimeConfig extends SDKConfig {
  reportUrl?: string
}
