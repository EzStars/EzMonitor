import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import * as process from 'node:process'
import { Injectable } from '@nestjs/common'
import { SourceMapConsumer } from 'source-map'

interface ErrorFrameDto {
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

interface SymbolicationInput {
  appId: string
  release?: string
  frames?: ErrorFrameDto[]
  stack?: string
}

interface SourceMapIndexItem {
  filePath: string
  mapPath: string
}

interface SourceMapIndex {
  [key: string]: SourceMapIndexItem
}

interface SymbolicationResult {
  status: 'symbolicated' | 'partial' | 'failed' | 'skipped'
  reason?: string
  frames?: ErrorFrameDto[]
}

function buildColumnCandidates(column: number): number[] {
  const candidates = [Math.max(0, column), Math.max(0, column - 1)]
  return [...new Set(candidates)]
}

function normalizeAssetPath(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') {
    return ''
  }

  try {
    const asUrl = new URL(trimmed)
    return asUrl.pathname
  }
  catch {
    return trimmed
  }
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^\w.-]/g, '_')
}

function isAlreadySourceFrame(filePath: string): boolean {
  if (!filePath) {
    return false
  }

  return filePath.includes('/src/')
    || filePath.includes('\\src\\')
    || filePath.endsWith('.ts')
    || filePath.endsWith('.tsx')
    || filePath.endsWith('.js')
    || filePath.endsWith('.jsx')
}

function parseFramesFromStack(stack?: string): ErrorFrameDto[] {
  if (!stack) {
    return []
  }

  const lines = stack.split('\n').map(line => line.trim()).filter(Boolean)
  const frames: ErrorFrameDto[] = []
  for (const line of lines) {
    const normalized = line.startsWith('at ') ? line.slice(3).trim() : line
    let functionName: string | undefined
    let locationPart = normalized

    if (normalized.endsWith(')') && normalized.includes(' (')) {
      const separator = normalized.lastIndexOf(' (')
      functionName = normalized.slice(0, separator).trim()
      locationPart = normalized.slice(separator + 2, -1).trim()
    }

    const lastColon = locationPart.lastIndexOf(':')
    const secondLastColon = lastColon > 0 ? locationPart.lastIndexOf(':', lastColon - 1) : -1

    if (lastColon <= 0 || secondLastColon <= 0) {
      frames.push({ raw: line })
      continue
    }

    const file = locationPart.slice(0, secondLastColon)
    const lineNumber = Number(locationPart.slice(secondLastColon + 1, lastColon))
    const columnNumber = Number(locationPart.slice(lastColon + 1))

    frames.push({
      functionName,
      file,
      line: Number.isFinite(lineNumber) ? lineNumber : undefined,
      column: Number.isFinite(columnNumber) ? columnNumber : undefined,
      raw: line,
    })
  }

  return frames
}

@Injectable()
export class SourceMapService {
  private readonly sourcemapRoot = join(process.cwd(), 'storage', 'sourcemaps')
  private readonly indexPath = join(this.sourcemapRoot, 'index.json')

  async saveSourceMap(payload: {
    appId: string
    release: string
    file: string
    map: string
  }): Promise<{ key: string, mapPath: string }> {
    const appId = sanitizeSegment(payload.appId)
    const release = sanitizeSegment(payload.release)
    const normalizedFile = normalizeAssetPath(payload.file)
    const fileName = sanitizeSegment(normalizedFile)

    const targetPath = join(this.sourcemapRoot, appId, release, `${fileName}.map`)
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, payload.map, 'utf-8')

    const key = this.getIndexKey(payload.appId, payload.release, normalizedFile)
    const index = await this.readIndex()
    index[key] = {
      filePath: normalizedFile,
      mapPath: targetPath,
    }
    await this.writeIndex(index)

    return {
      key,
      mapPath: targetPath,
    }
  }

  async symbolicateError(
    payload: SymbolicationInput,
  ): Promise<SymbolicationResult> {
    if (!payload.release) {
      return {
        status: 'skipped',
        reason: 'release is missing',
      }
    }

    const originalFrames = payload.frames && payload.frames.length > 0
      ? payload.frames
      : parseFramesFromStack(payload.stack)

    if (originalFrames.length === 0) {
      return {
        status: 'skipped',
        reason: 'no frames to symbolicate',
      }
    }

    const index = await this.readIndex()
    let hasSuccess = false
    let hasFailure = false
    let hasResolvableFrame = false
    const symbolicatedFrames: ErrorFrameDto[] = []

    for (const frame of originalFrames) {
      if (!frame.file || !frame.line || !frame.column) {
        symbolicatedFrames.push(frame)
        continue
      }

      hasResolvableFrame = true

      const normalizedFile = normalizeAssetPath(frame.file)

      if (isAlreadySourceFrame(normalizedFile) && !normalizedFile.includes('/assets/')) {
        symbolicatedFrames.push({
          ...frame,
          originalFile: normalizedFile,
          originalLine: frame.line,
          originalColumn: frame.column,
          originalFunctionName: frame.functionName,
        })
        hasSuccess = true
        continue
      }

      const indexKey = this.getIndexKey(payload.appId, payload.release, normalizedFile)
      const fallbackKey = this.findFallbackKey(index, payload.appId, payload.release, normalizedFile)
      const item = index[indexKey] ?? (fallbackKey ? index[fallbackKey] : undefined)

      if (!item) {
        symbolicatedFrames.push(frame)
        hasFailure = true
        continue
      }

      try {
        const rawMap = await readFile(item.mapPath, 'utf-8')
        const consumer = await new SourceMapConsumer(rawMap)
        let originalFile: string | undefined
        let originalLine: number | undefined
        let originalColumn: number | undefined
        let originalFunctionName: string | undefined

        for (const columnCandidate of buildColumnCandidates(frame.column)) {
          const position = consumer.originalPositionFor({
            line: frame.line,
            column: columnCandidate,
            bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
          })

          if (position.source && position.line && position.column !== null) {
            originalFile = position.source
            originalLine = position.line
            originalColumn = position.column
            originalFunctionName = position.name ?? undefined
            break
          }
        }
        consumer.destroy()

        if (!originalFile || !originalLine || originalColumn === undefined) {
          symbolicatedFrames.push(frame)
          hasFailure = true
          continue
        }

        symbolicatedFrames.push({
          ...frame,
          originalFile,
          originalLine,
          originalColumn,
          originalFunctionName,
        })
        hasSuccess = true
      }
      catch {
        symbolicatedFrames.push(frame)
        hasFailure = true
      }
    }

    if (!hasResolvableFrame) {
      return {
        status: 'skipped',
        frames: symbolicatedFrames,
        reason: 'no frames with location',
      }
    }

    if (hasSuccess && !hasFailure) {
      return {
        status: 'symbolicated',
        frames: symbolicatedFrames,
      }
    }

    if (hasSuccess) {
      return {
        status: 'partial',
        frames: symbolicatedFrames,
        reason: 'some frames could not be symbolicated',
      }
    }

    return {
      status: 'failed',
      frames: symbolicatedFrames,
      reason: 'no frames symbolicated',
    }
  }

  private getIndexKey(appId: string, release: string, filePath: string): string {
    return `${appId}::${release}::${filePath}`
  }

  private findFallbackKey(index: SourceMapIndex, appId: string, release: string, filePath: string): string | undefined {
    const normalized = normalizeAssetPath(filePath)
    const candidates = Object.keys(index).filter(key => key.startsWith(`${appId}::${release}::`))
    return candidates.find((key) => {
      const item = index[key]
      return item.filePath === normalized || item.filePath.endsWith(normalized)
    })
  }

  private async readIndex(): Promise<SourceMapIndex> {
    try {
      const raw = await readFile(this.indexPath, 'utf-8')
      const parsed = JSON.parse(raw) as SourceMapIndex
      return parsed ?? {}
    }
    catch {
      return {}
    }
  }

  private async writeIndex(index: SourceMapIndex): Promise<void> {
    await mkdir(dirname(this.indexPath), { recursive: true })
    await writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8')
  }
}
