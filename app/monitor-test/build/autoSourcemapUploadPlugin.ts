import type { Plugin } from 'vite'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

interface AutoSourcemapUploadPluginOptions {
  appId: string
  release: string
  uploadKey?: string
  baseUrl: string
  strict?: boolean
}

interface SourceMapPayload {
  appId: string
  release: string
  file: string
  map: string
}

async function collectSourcemapPayloads(
  assetsDir: string,
  options: AutoSourcemapUploadPluginOptions,
): Promise<SourceMapPayload[]> {
  const files = await fs.readdir(assetsDir)
  const payloads: SourceMapPayload[] = []

  for (const file of files) {
    if (!file.endsWith('.js.map')) {
      continue
    }
    const mapPath = path.join(assetsDir, file)
    const map = await fs.readFile(mapPath, 'utf8')
    payloads.push({
      appId: options.appId,
      release: options.release,
      file: `assets/${file.slice(0, -4)}`,
      map,
    })
  }

  return payloads
}

export function createAutoSourcemapUploadPlugin(
  options: AutoSourcemapUploadPluginOptions,
): Plugin {
  return {
    name: 'monitor-test-auto-sourcemap-upload',
    apply: 'build',
    async closeBundle() {
      if (!options.uploadKey) {
        return
      }

      const assetsDir = path.resolve(process.cwd(), 'dist/assets')
      let payloads: SourceMapPayload[] = []
      try {
        payloads = await collectSourcemapPayloads(assetsDir, options)
      }
      catch (error) {
        if (options.strict) {
          throw error
        }
        console.warn('[monitor-test] skip sourcemap upload:', error)
        return
      }

      for (const payload of payloads) {
        const response = await fetch(`${options.baseUrl}/api/monitor/sourcemap`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-monitor-upload-key': options.uploadKey,
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const body = await response.text()
          const error = new Error(`[monitor-test] sourcemap upload failed (${response.status}): ${body}`)
          if (options.strict) {
            throw error
          }
          console.warn(error.message)
        }
      }
    },
  }
}
