export class ErrorFrameDto {
  file?: string
  line?: number
  column?: number
  functionName?: string
  raw?: string
  originalFile?: string
  originalLine?: number
  originalColumn?: number
  originalFunctionName?: string
}

export class CreateErrorLogDto {
  appId: string
  timestamp: Date
  message: string
  errorType?: string
  stack?: string
  url?: string
  userAgent?: string
  sessionId?: string
  userId?: string
  appVersion?: string
  release?: string
  environment?: string
  fingerprint?: string
  traceId?: string
  frames?: ErrorFrameDto[]
  detail?: Record<string, unknown>
}
