import type {
  PendingReportItem,
  ReportPayload,
  RetryStrategy,
} from '../types/reporter'

/**
 * 统一的重试调度器
 * - 维护失败队列与重试时间
 * - 定时扫描可重试项
 * - 可响应网络上下线
 */
export class RetryScheduler {
  private strategy: RetryStrategy
  private sendFn: (payload: ReportPayload) => Promise<boolean>
  private debug?: boolean

  private failedQueue: PendingReportItem[] = []
  private timer?: number
  private online = true

  constructor(
    strategy: RetryStrategy,
    sendFn: (payload: ReportPayload) => Promise<boolean>,
    debug?: boolean,
  ) {
    this.strategy = strategy
    this.sendFn = sendFn
    this.debug = debug
  }

  start(intervalMs = 5000) {
    if (typeof window === 'undefined')
      return
    if (this.timer)
      return
    this.timer = window.setInterval(() => {
      if (this.failedQueue.length > 0 && this.online) {
        void this.processReadyItems()
      }
    }, intervalMs)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  onOnline() {
    this.online = true
    void this.processReadyItems()
  }

  onOffline() {
    this.online = false
  }

  add(payload: ReportPayload) {
    const item: PendingReportItem = {
      payload,
      retries: 0,
      nextRetryTime: Date.now() + this.strategy.initialDelay,
    }
    this.failedQueue.push(item)
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[RetryScheduler] added, size =', this.failedQueue.length)
    }
  }

  async retryAll() {
    // 立即全部标记为可重试
    const now = Date.now()
    this.failedQueue.forEach(i => (i.nextRetryTime = now))
    await this.processReadyItems()
  }

  private async processReadyItems() {
    const now = Date.now()
    const ready: PendingReportItem[] = []
    for (let i = this.failedQueue.length - 1; i >= 0; i--) {
      const item = this.failedQueue[i]
      if (item.nextRetryTime <= now) {
        ready.push(item)
        this.failedQueue.splice(i, 1)
      }
    }

    for (const item of ready) {
      try {
        const ok = await this.sendFn(item.payload)
        if (ok) {
          if (this.debug) {
            // eslint-disable-next-line no-console
            console.log('[RetryScheduler] retry ok')
          }
          continue
        }
        throw new Error('send failed')
      }
      catch {
        item.retries++
        if (item.retries < this.strategy.maxRetries) {
          const delay = Math.min(
            this.strategy.initialDelay
            * this.strategy.backoffMultiplier ** item.retries,
            this.strategy.maxDelay,
          )
          item.nextRetryTime = Date.now() + delay
          this.failedQueue.push(item)
          if (this.debug) {
            // eslint-disable-next-line no-console
            console.log(
              `[RetryScheduler] retry fail, next in ${delay}ms (${item.retries}/${this.strategy.maxRetries})`,
            )
          }
        }
        else if (this.debug) {
          console.error('[RetryScheduler] max retries reached, drop')
        }
      }
    }
  }
}

export default RetryScheduler
