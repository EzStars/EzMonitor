export interface ErrorFrame {
  file?: string
  line?: number
  column?: number
  functionName?: string
  raw?: string
}

export interface ErrorPluginPayload {
  type: string
  message: string
  stack?: string
  url?: string
  userAgent?: string
  timestamp: number
  appId?: string
  appVersion?: string
  release?: string
  environment?: string
  sessionId?: string
  userId?: string
  fingerprint: string
  traceId?: string
  frames?: ErrorFrame[]
  detail?: Record<string, unknown>
}

export interface ErrorPluginConfig {
  captureJsError?: boolean
  captureUnhandledRejection?: boolean
  captureResourceError?: boolean
  captureConsoleError?: boolean
  attachReplayContext?: boolean
  sampleRate?: number
  dedupeWindowMs?: number
  flushOnError?: boolean
  maxStackFrames?: number
  eventFilter?: (payload: ErrorPluginPayload) => boolean
}
