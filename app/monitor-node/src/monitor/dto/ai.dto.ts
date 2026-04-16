export interface AiErrorFrameDto {
  file?: string
  line?: number
  column?: number
  functionName?: string
  originalFile?: string
  originalLine?: number
  originalColumn?: number
  originalFunctionName?: string
}

export interface AiAnalyzeErrorDto {
  message: string
  errorType?: string
  stack?: string
  url?: string
  frames?: AiErrorFrameDto[]
  apiKey?: string
  apiBaseUrl?: string
  model?: string
}

export interface AiStatusQueryDto {
  hasClientApiKey?: boolean
  apiBaseUrl?: string
  model?: string
}

export type AiErrorCode
  = | 'missing_api_key'
    | 'upstream_auth_error'
    | 'upstream_request_error'
    | 'upstream_http_error'
    | 'upstream_timeout'
    | 'upstream_network_error'
    | 'unknown'

export interface AiStatusResult {
  available: boolean
  hasApiKey: boolean
  keySource: 'server' | 'client' | 'none'
  apiBaseUrl: string
  model: string
  message?: string
}

export interface AiAnalysisResult {
  available: boolean
  model?: string
  analysis?: string
  error?: string
  errorCode?: AiErrorCode
}
