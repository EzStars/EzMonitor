import type { SDKConfig } from '../types/config'
import type { EventBus } from './EventBus'
import type { TransportStrategy } from './transports/strategy'
import type { TransportAdapter } from './transports/types'
import type {
  IReporter,
  ReporterConfig,
  ReportPayload,
  ReportResponse,
  RetryStrategy,
} from './types/reporter'
import { INTERNAL_EVENTS } from '../types/events'
import BatchBuffer from './batch/BatchBuffer'
import RetryScheduler from './retry/RetryScheduler'
import { BeaconTransport } from './transports/BeaconTransport'
import { ImageTransport } from './transports/ImageTransport'
import {
  DefaultTransportStrategy,

} from './transports/strategy'
import { XHRTransport } from './transports/XHRTransport'
import { TransportType } from './types/reporter'

/**
 * 默认重试策略
 */
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  backoffMultiplier: 2, // 指数退避
  maxDelay: 30000, // 最大30秒
}

/**
 * Reporter 核心实现
 * 负责数据上报、传输策略选择、失败重试
 */
export class Reporter implements IReporter {
  private config: SDKConfig
  private eventBus: EventBus
  private reporterConfig: ReporterConfig
  private retryStrategy: RetryStrategy

  // 批量缓冲
  private batchBuffer?: BatchBuffer

  // 重试与批量定时器
  private batchTimer?: number
  private retryScheduler?: RetryScheduler

  private isOnline: boolean = true

  // 传输适配器集合
  private transports: Record<TransportType, TransportAdapter>
  private transportStrategy: TransportStrategy

  constructor(config: SDKConfig, eventBus: EventBus) {
    this.config = config
    this.eventBus = eventBus

    // 初始化传输适配器
    this.transports = {
      [TransportType.BEACON]: new BeaconTransport(),
      [TransportType.XHR]: new XHRTransport(),
      [TransportType.IMAGE]: new ImageTransport(),
    }
    this.transportStrategy
      = config.transportStrategy || new DefaultTransportStrategy()

    // 构建 Reporter 配置
    this.reporterConfig = {
      url: config.reportUrl || '',
      forceXHR: config.forceXHR || false,
      enableRetry: config.enableRetry !== false, // 默认启用
      beforeReport: config.beforeReport,
      onSuccess: config.onReportSuccess,
      onError: config.onReportError,
      afterReport: config.afterReport,
    }

    // 合并重试策略
    this.retryStrategy = {
      ...DEFAULT_RETRY_STRATEGY,
      ...config.retryStrategy,
    }

    // 批量缓冲（如果启用批量或离线缓存）
    if (config.enableBatch || config.enableOfflineCache) {
      this.batchBuffer = new BatchBuffer(
        {
          maxSize: config.maxCacheSize || 1000,
          batchSize: config.batchSize || 50,
          storageKey: `${config.appId || 'ezmonitor'}_report_queue`,
          enablePersistence: config.enableOfflineCache !== false,
          intervalMs: config.batchInterval || 10000,
          debug: config.debug,
        },
        async (items) => {
          const dataList = items.map(i => i.data)
          await this.sendBatch(dataList)
        },
      )
    }
  }

  /**
   * 初始化 Reporter
   */
  init(): void {
    // 监听上报事件
    this.setupEventListeners()

    // 监听网络状态
    this.setupNetworkListeners()

    // 监听配置变更（热更新 Reporter 行为）
    this.setupConfigHotUpdate()

    // 启动批量缓冲
    if (this.batchBuffer) {
      this.batchBuffer.start()
    }

    // 启动重试调度器
    this.setupRetryScheduler()

    if (this.config.debug) {
      console.log('[Reporter] Initialized successfully')
    }
  }

  /**
   * 监听配置变更（热更新 Reporter 行为）
   */
  private setupConfigHotUpdate(): void {
    this.eventBus.on(INTERNAL_EVENTS.CONFIG_CHANGED, ({ key, value }) => {
      switch (key) {
        case 'reportUrl':
          this.reporterConfig.url = String(value || '')
          break
        case 'forceXHR':
          this.reporterConfig.forceXHR = Boolean(value)
          break
        case 'enableRetry':
          this.reporterConfig.enableRetry = value !== false
          break
        case 'retryStrategy':
          this.retryStrategy = {
            ...this.retryStrategy,
            ...(value as Partial<RetryStrategy>),
          }
          break
        case 'beforeReport':
          this.reporterConfig.beforeReport
            = value as ReporterConfig['beforeReport']
          break
        case 'onReportSuccess':
          this.reporterConfig.onSuccess = value as ReporterConfig['onSuccess']
          break
        case 'onReportError':
          this.reporterConfig.onError = value as ReporterConfig['onError']
          break
        case 'afterReport':
          this.reporterConfig.afterReport
            = value as ReporterConfig['afterReport']
          break
        case 'transportStrategy':
          this.transportStrategy
            = (value as TransportStrategy) || new DefaultTransportStrategy()
          break
        default:
          // 其他配置由上层处理
          break
      }

      if (this.config.debug) {
        console.log('[Reporter] Config hot-updated:', key, value)
      }
    })
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听单条数据上报
    this.eventBus.on(INTERNAL_EVENTS.REPORT_DATA, async (payload) => {
      try {
        // 如果启用批量上报，数据进入队列
        if (this.batchBuffer && this.config.enableBatch) {
          const shouldFlush = this.batchBuffer.add(payload.data, payload.type)
          if (shouldFlush) {
            await this.batchBuffer.flushNow()
          }
        }
        else {
          // 立即上报
          await this.report(payload.data, payload.type)
        }
      }
      catch (error) {
        console.error('[Reporter] Failed to report data:', error)
      }
    })

    // 监听批量数据上报（直接上报，不进队列）
    this.eventBus.on(INTERNAL_EVENTS.REPORT_BATCH, async (payload) => {
      try {
        await this.reportBatch(payload.items)
      }
      catch (error) {
        console.error('[Reporter] Failed to report batch:', error)
      }
    })
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined')
      return

    // 监听网络恢复
    window.addEventListener('online', () => {
      this.isOnline = true
      if (this.config.debug) {
        console.log('[Reporter] Network online, retrying failed reports...')
      }
      this.retryScheduler?.onOnline()
      void this.retryFailed()
    })

    // 监听网络断开
    window.addEventListener('offline', () => {
      this.isOnline = false
      if (this.config.debug) {
        console.log('[Reporter] Network offline')
      }
      this.retryScheduler?.onOffline()
    })

    // 初始化网络状态
    this.isOnline = navigator.onLine
  }

  /**
   * 启动重试定时器
   */
  private setupRetryScheduler(): void {
    this.retryScheduler = new RetryScheduler(
      this.retryStrategy,
      async (payload) => {
        const res = await this.send(payload)
        return res.success
      },
      this.config.debug,
    )
    this.retryScheduler.start(5000)
  }

  /**
   * 上报单条数据
   */
  async report(data: unknown, type?: string): Promise<ReportResponse> {
    // 构建上报数据包
    const payload: ReportPayload = {
      data,
      type,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      appId: this.config.appId,
      timestamp: Date.now(),
    }

    // 调用生命周期钩子
    if (this.reporterConfig.beforeReport) {
      try {
        await this.reporterConfig.beforeReport(payload.data)
      }
      catch (error) {
        console.error('[Reporter] beforeReport hook error:', error)
      }
    }

    try {
      const response = await this.send(payload)

      if (response.success) {
        if (this.reporterConfig.onSuccess) {
          this.reporterConfig.onSuccess(payload.data)
        }
        this.eventBus.emit(INTERNAL_EVENTS.REPORT_SUCCESS, {
          data: payload.data,
        })
        return response
      }

      // send 未抛错但失败
      const reportError = response.error || new Error('Report failed')
      if (this.reporterConfig.onError) {
        this.reporterConfig.onError(payload.data, reportError)
      }
      this.eventBus.emit(INTERNAL_EVENTS.REPORT_ERROR, {
        data: payload.data,
        error: reportError,
      })
      if (this.reporterConfig.enableRetry && this.isOnline) {
        this.retryScheduler?.add(payload)
      }
      return response
    }
    catch (error) {
      const reportError = error as Error
      if (this.reporterConfig.onError) {
        this.reporterConfig.onError(payload.data, reportError)
      }
      this.eventBus.emit(INTERNAL_EVENTS.REPORT_ERROR, {
        data: payload.data,
        error: reportError,
      })
      if (this.reporterConfig.enableRetry && this.isOnline) {
        this.retryScheduler?.add(payload)
      }
      return {
        success: false,
        error: reportError,
        transportType: payload.sendType || TransportType.XHR,
      }
    }
    finally {
      // 最终回调
      if (this.reporterConfig.afterReport) {
        this.reporterConfig.afterReport(payload.data)
      }
    }
  }

  /**
   * 批量上报数据
   */
  async reportBatch(items: unknown[]): Promise<ReportResponse> {
    if (!items || items.length === 0) {
      return {
        success: true,
        transportType: 'beacon' as TransportType,
      }
    }

    // 将批量数据作为一个整体上报
    return this.report(items, 'batch')
  }

  /**
   * 发送数据
   */
  private async send(payload: ReportPayload): Promise<ReportResponse> {
    // 选择传输方式
    const transportType = this.selectTransportType(payload)
    payload.sendType = transportType

    const jsonData = JSON.stringify(payload)

    if (this.config.debug) {
      console.log(
        `[Reporter] Sending data via ${transportType}:`,
        payload.data,
      )
    }

    try {
      const adapter = this.transports[transportType]
      if (!adapter || !adapter.isSupported()) {
        throw new Error(`${transportType} not supported`)
      }
      const response = await adapter.send(this.reporterConfig.url, jsonData)

      return {
        success: true,
        data: response,
        transportType,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error as Error,
        transportType,
      }
    }
  }

  /**
   * 选择传输方式
   */
  private selectTransportType(payload: ReportPayload): TransportType {
    if (this.reporterConfig.forceXHR)
      return TransportType.XHR
    return this.transportStrategy.select(payload, {
      supportBeacon: this.isSupportBeacon(),
    })
  }

  // 具体发送方法已由传输适配器承担

  /**
   * 添加到重试队列
   */
  // 重试逻辑由 RetryScheduler 负责

  /**
   * 处理重试队列
   */
  // 由 RetryScheduler 处理

  /**
   * 手动重试所有失败的数据
   */
  async retryFailed(): Promise<void> {
    await this.retryScheduler?.retryAll()
  }

  /**
   * 启动批量上报定时器
   */
  // 批量计时由 BatchBuffer 管理

  /**
   * 批量上报队列中的数据
   */
  // flush 由 BatchBuffer 调用 onFlush

  /**
   * 批量发送数据
   */
  private async sendBatch(dataList: unknown[]): Promise<void> {
    if (dataList.length === 0)
      return

    // 将批量数据作为一个整体上报
    try {
      await this.report(dataList, 'batch')
    }
    catch (error) {
      console.error('[Reporter] Failed to send batch:', error)
    }
  }

  /**
   * 处理离线期间缓存的数据
   */
  // 离线缓存处理由 BatchBuffer 在 start() 时完成

  /**
   * 销毁 Reporter
   */
  destroy(): void {
    // 停止批量缓冲
    this.batchBuffer?.stop()

    // 停止重试调度器
    this.retryScheduler?.stop()

    // 尝试上报剩余的队列数据（非阻塞）
    if (this.batchBuffer && !this.batchBuffer.isEmpty()) {
      this.batchBuffer.flushNow().catch((error) => {
        console.error('[Reporter] Failed to flush remaining queue:', error)
      })
    }

    // 尝试上报剩余的重试数据（非阻塞）
    this.retryScheduler?.retryAll().catch((error) => {
      console.error('[Reporter] Failed to send remaining data:', error)
    })

    if (this.config.debug) {
      console.log('[Reporter] Destroyed')
    }
  }

  /**
   * 检查是否支持 sendBeacon
   */
  private isSupportBeacon(): boolean {
    return (
      typeof navigator !== 'undefined'
      && 'sendBeacon' in navigator
      && typeof navigator.sendBeacon === 'function'
    )
  }

  /**
   * 计算数据大小（KB）
   */
  private getDataSize(data: unknown): number {
    const str = JSON.stringify(data)
    // 计算字节数（UTF-8 编码）
    const bytes = new Blob([str]).size
    // 转换为 KB
    return bytes / 1024
  }
}
