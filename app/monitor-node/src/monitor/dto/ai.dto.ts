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
}

export interface AiAnalysisResult {
  available: boolean
  model?: string
  analysis?: string
  error?: string
}
