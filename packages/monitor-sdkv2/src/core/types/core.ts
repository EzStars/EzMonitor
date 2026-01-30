import type { SDKConfig } from '../../types/config'
import type { IPluginManager } from '../../types/plugin'
import type { EventBus } from '../EventBus'

/**
 * SDK 核心状态枚举
 *
 * 状态流转图：
 * ```
 * IDLE → INITIALIZING → INITIALIZED → STARTING → STARTED
 *                                         ↓
 * DESTROYED ← DESTROYING ← STOPPED ← STOPPING
 * ```
 */
export enum SDKStatus {
  /** 空闲状态 - SDK 刚创建，未初始化 */
  IDLE = 'idle',
  /** 初始化中 - 正在设置配置和插件 */
  INITIALIZING = 'initializing',
  /** 已初始化 - 插件已准备就绪 */
  INITIALIZED = 'initialized',
  /** 启动中 - 正在启动所有插件 */
  STARTING = 'starting',
  /** 已启动 - 所有插件正常运行 */
  STARTED = 'started',
  /** 停止中 - 正在停止所有插件 */
  STOPPING = 'stopping',
  /** 已停止 - 插件已停止但未销毁 */
  STOPPED = 'stopped',
  /** 销毁中 - 正在清理所有资源 */
  DESTROYING = 'destroying',
  /** 已销毁 - SDK 生命周期结束 */
  DESTROYED = 'destroyed',
}

/**
 * SDK 核心接口
 */
export interface ISDKCore {
  /** 当前状态 */
  readonly status: SDKStatus
  /** 配置对象 */
  readonly config: SDKConfig
  /** 事件总线 */
  readonly eventBus: EventBus
  /** 插件管理器 */
  readonly pluginManager: IPluginManager
  /** 会话 ID */
  readonly sessionId: string

  /** 初始化 SDK */
  init: (config?: Partial<SDKConfig>) => Promise<void>
  /** 启动 SDK */
  start: () => Promise<void>
  /** 停止 SDK */
  stop: () => Promise<void>
  /** 销毁 SDK */
  destroy: () => Promise<void>
  /** 获取当前状态 */
  getStatus: () => SDKStatus
}
