import { promises as fs } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'

const DEFAULT_ENDPOINT = '/api/monitor/sourcemap'

type LoggerLike = Pick<Console, 'info' | 'warn' | 'error'>

export interface AutoSourcemapUploadPluginOptions {
  appId: string
  release: string
  uploadKey?: string
  baseUrl: string
  strict?: boolean
  endpoint?: string
  distDir?: string
  logger?: LoggerLike
}

export interface AutoSourcemapUploadPlugin {
  name: string
  apply: 'build'
  closeBundle: () => Promise<void>
}

export function createAutoSourcemapUploadPlugin(options: AutoSourcemapUploadPluginOptions): AutoSourcemapUploadPlugin {
  const logger = options.logger ?? console

  return {
    name: 'ez-monitor:auto-sourcemap-upload',
    apply: 'build',
    async closeBundle() {
      const strict = options.strict === true
      const uploadKey = options.uploadKey?.trim()
      if (!uploadKey) {
        const message = '[EzMonitor] skip sourcemap upload: MONITOR_SOURCEMAP_UPLOAD_KEY is empty'
        if (strict)
          throw new Error(message)
        logger.warn(message)
        return
      }

      const appId = options.appId?.trim()
      const release = options.release?.trim()
      if (!appId || !release) {
        const message = '[EzMonitor] skip sourcemap upload: appId or release is empty'
        if (strict)
          throw new Error(message)
        logger.warn(message)
        return
      }

      const distDir = join(process.cwd(), options.distDir ?? 'dist')
      const mapFiles = await collectMapFiles(distDir)
      if (!mapFiles.length) {
        logger.warn(`[EzMonitor] skip sourcemap upload: no .map files found under ${distDir}`)
        return
      }

      const endpoint = normalizeEndpoint(options.endpoint)
      const uploadUrl = `${(options.baseUrl || '').replace(/\/$/, '')}${endpoint}`

      let successCount = 0
      for (const mapFile of mapFiles) {
        const map = await fs.readFile(mapFile, 'utf8')
        const file = relative(distDir, mapFile).replace(/\\/g, '/')
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-monitor-upload-key': uploadKey,
          },
          body: JSON.stringify({
            appId,
            release,
            file,
            map,
          }),
        })

        if (!response.ok) {
          const responseText = await safeReadResponseText(response)
          const message = `[EzMonitor] sourcemap upload failed (${response.status}) for ${file}: ${responseText}`
          if (strict)
            throw new Error(message)
          logger.warn(message)
          continue
        }

        successCount += 1
      }

      logger.info(`[EzMonitor] sourcemap upload done: ${successCount}/${mapFiles.length}`)
    },
  }
}

async function collectMapFiles(rootDir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof fs.readdir>>
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true })
    }
    catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (entry.isFile() && fullPath.endsWith('.map'))
        files.push(fullPath)
    }
  }

  await walk(rootDir)
  return files
}

function normalizeEndpoint(endpoint?: string): string {
  if (!endpoint)
    return DEFAULT_ENDPOINT
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()) || '<empty response>'
  }
  catch {
    return '<failed to read response body>'
  }
}
