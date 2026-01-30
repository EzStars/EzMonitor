import type { ReportQueueItem } from '../ReportQueue'
import { ReportQueue } from '../ReportQueue'

export interface BatchBufferOptions {
  maxSize: number
  batchSize: number
  storageKey: string
  enablePersistence: boolean
  intervalMs: number
  debug?: boolean
}

export type FlushHandler = (items: ReportQueueItem[]) => Promise<void> | void

/**
 * 批量缓冲器：封装 ReportQueue 与定时/阈值 flush 逻辑
 */
export class BatchBuffer {
  private queue: ReportQueue
  private timer?: number
  private readonly opts: BatchBufferOptions
  private readonly onFlush: FlushHandler

  constructor(options: BatchBufferOptions, onFlush: FlushHandler) {
    this.opts = options
    this.onFlush = onFlush
    this.queue = new ReportQueue({
      maxSize: options.maxSize,
      batchSize: options.batchSize,
      storageKey: options.storageKey,
      enablePersistence: options.enablePersistence,
      // 过期时间由 Reporter 在构造 ReportQueue 时注入；若需要也可在此扩展
      expireMs: undefined as any,
    } as any)
  }

  /**
   * 启动定时 flush，并在存在离线缓存时立即尝试 flush 一次
   */
  start() {
    if (typeof window === 'undefined')
      return
    if (!this.timer) {
      this.timer = window.setInterval(() => {
        if (!this.queue.isEmpty()) {
          void this.flushNow().catch((err) => {
            console.error('[BatchBuffer] flush failed:', err)
          })
        }
      }, this.opts.intervalMs)
      if (this.opts.debug) {
        // eslint-disable-next-line no-console
        console.log('[BatchBuffer] timer started:', this.opts.intervalMs)
      }
    }

    // 启动时处理离线缓存
    if (!this.queue.isEmpty()) {
      void this.flushNow()
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  add(data: unknown, type?: string): boolean {
    const should = this.queue.add(data, type)
    return should
  }

  addBatch(items: ReportQueueItem[]): boolean {
    return this.queue.addBatch(items)
  }

  isEmpty(): boolean {
    return this.queue.isEmpty()
  }

  async flushNow(): Promise<void> {
    const items = this.queue.flush()
    if (items.length === 0)
      return
    await this.onFlush(items)
  }
}

export default BatchBuffer
