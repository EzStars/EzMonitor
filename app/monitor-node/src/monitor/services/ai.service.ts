import type { AiAnalysisResult, AiAnalyzeErrorDto, AiStatusQueryDto, AiStatusResult } from '../dto/ai.dto'
import * as process from 'node:process'
import { Injectable } from '@nestjs/common'

interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LlmChoice {
  message: { role: string, content: string }
  finish_reason: string
}

interface LlmResponse {
  choices: LlmChoice[]
  model?: string
}

function buildSystemPrompt(): string {
  return `You are an expert frontend/fullstack engineer specializing in JavaScript/TypeScript error diagnosis.
When given an error report from a production monitoring system, you must:
1. Identify the root cause of the error based on the error message, type, and stack trace.
2. Pinpoint the exact source code location using symbolicated frame information (originalFile, originalLine, originalFunctionName).
3. Explain what code is likely doing at that location and why it might fail.
4. Provide a concise, actionable code fix suggestion.

Format your response in the following sections:
## 错误原因
[Explain the root cause in Chinese, concisely]

## 源码位置
[List the most relevant symbolicated frames, format: file:line - functionName]

## 修复建议
[Provide a concrete code fix suggestion with example code if applicable]

Keep the response concise and actionable. Use Chinese for explanations.`
}

function buildUserPrompt(dto: AiAnalyzeErrorDto): string {
  const parts: string[] = []

  parts.push(`**错误类型**: ${dto.errorType ?? 'unknown'}`)
  parts.push(`**错误消息**: ${dto.message}`)

  if (dto.url) {
    parts.push(`**发生 URL**: ${dto.url}`)
  }

  if (dto.stack) {
    const truncatedStack = dto.stack.length > 2000 ? `${dto.stack.slice(0, 2000)}\n...(truncated)` : dto.stack
    parts.push(`\n**错误堆栈**:\n\`\`\`\n${truncatedStack}\n\`\`\``)
  }

  const symbolicated = (dto.frames ?? []).filter(
    frame => frame.originalFile && typeof frame.originalLine === 'number',
  )

  if (symbolicated.length > 0) {
    const frameLines = symbolicated.slice(0, 10).map((frame) => {
      const loc = `${frame.originalFile}:${frame.originalLine}:${frame.originalColumn ?? 0}`
      const fn = frame.originalFunctionName ? ` (${frame.originalFunctionName})` : ''
      return `  - ${loc}${fn}`
    })
    parts.push(`\n**源码定位帧 (symbolicated frames)**:\n${frameLines.join('\n')}`)
  }

  parts.push('\n请分析此错误，给出根因、源码位置和修复建议。')

  return parts.join('\n')
}

@Injectable()
export class AiService {
  private readonly apiKey: string | undefined
  private readonly apiBaseUrl: string
  private readonly model: string

  constructor() {
    this.apiKey = process.env.AI_API_KEY
    this.apiBaseUrl = (process.env.AI_API_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    this.model = process.env.AI_MODEL ?? 'gpt-4o-mini'
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey)
  }

  getStatus(query?: AiStatusQueryDto): AiStatusResult {
    const apiBaseUrl = (query?.apiBaseUrl?.trim() || this.apiBaseUrl).replace(/\/$/, '')
    const model = query?.model?.trim() || this.model
    const hasServerApiKey = this.isAvailable()
    const hasClientApiKey = Boolean(query?.hasClientApiKey)
    const available = hasServerApiKey || hasClientApiKey
    const keySource = hasServerApiKey
      ? 'server'
      : hasClientApiKey
        ? 'client'
        : 'none'

    return {
      available,
      hasApiKey: available,
      keySource,
      apiBaseUrl,
      model,
      message: available
        ? keySource === 'server'
          ? 'AI 服务可用（使用服务端密钥）'
          : 'AI 服务可用（将使用前端配置密钥）'
        : 'AI 功能未配置，请在前端或服务端提供 AI_API_KEY。',
    }
  }

  async analyzeError(dto: AiAnalyzeErrorDto): Promise<AiAnalysisResult> {
    const apiKey = dto.apiKey?.trim() || this.apiKey
    if (!apiKey) {
      return {
        available: false,
        errorCode: 'missing_api_key',
        error: 'AI 功能未配置，请在前端配置 AI_API_KEY，或在服务端 .env 中设置 AI_API_KEY。',
      }
    }

    const apiBaseUrl = (dto.apiBaseUrl?.trim() || this.apiBaseUrl).replace(/\/$/, '')
    const model = dto.model?.trim() || this.model

    const messages: LlmMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(dto) },
    ]

    try {
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        const errorCode = response.status === 401 || response.status === 403
          ? 'upstream_auth_error'
          : response.status === 400 || response.status === 404 || response.status === 422
            ? 'upstream_request_error'
            : 'upstream_http_error'
        return {
          available: true,
          model,
          errorCode,
          error: `LLM API 请求失败 (${response.status}): ${errorText}`,
        }
      }

      const data = await response.json() as LlmResponse
      const content = data.choices?.[0]?.message?.content ?? ''

      return {
        available: true,
        model: data.model ?? model,
        analysis: content,
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const lowerMessage = message.toLowerCase()
      const errorCode = lowerMessage.includes('timeout')
        ? 'upstream_timeout'
        : lowerMessage.includes('econnrefused') || lowerMessage.includes('enotfound') || lowerMessage.includes('fetch failed')
          ? 'upstream_network_error'
          : 'unknown'
      return {
        available: true,
        model,
        errorCode,
        error: `AI 分析请求出错: ${message}`,
      }
    }
  }
}
