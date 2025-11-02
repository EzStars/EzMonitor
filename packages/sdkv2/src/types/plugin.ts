import type { EventBus } from '../core/EventBus';
import type { SDKConfig } from './config';

/**
 * 插件生命周期状态枚举
 *
 * 状态流转图：
 * ```
 * REGISTERED → INITIALIZED → STARTED → STOPPED → DESTROYED
 *      ↓            ↓           ↓         ↓
 *   DESTROYED ← DESTROYED ← DESTROYED ← DESTROYED
 * ```
 */
export enum PluginStatus {
  /** 已注册 - 插件已注册到管理器中 */
  REGISTERED = 'registered',
  /** 已初始化 - 插件已完成初始化配置 */
  INITIALIZED = 'initialized',
  /** 已启动 - 插件正在运行中 */
  STARTED = 'started',
  /** 已停止 - 插件已停止但未销毁 */
  STOPPED = 'stopped',
  /** 已销毁 - 插件生命周期结束 */
  DESTROYED = 'destroyed',
}

/**
 * 插件接口
 */
export interface IPlugin {
  /** 插件唯一标识 */
  readonly name: string;
  /** 插件版本 */
  readonly version: string;
  /** 插件描述 */
  readonly description?: string;
  /** 插件依赖 */
  readonly dependencies?: string[];
  /** 当前状态 */
  status: PluginStatus;

  /** 初始化插件 */
  init?(config: SDKConfig, eventBus: EventBus): Promise<void> | void;
  /** 启动插件 */
  start?(config: SDKConfig, eventBus: EventBus): Promise<void> | void;
  /** 停止插件 */
  stop?(): Promise<void> | void;
  /** 销毁插件 */
  destroy?(): Promise<void> | void;
}

/**
 * 插件构造器
 */
export type PluginConstructor = new (...args: any[]) => IPlugin;

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  plugin: IPlugin;
  config?: Record<string, any>;
}

/**
 * 插件管理器接口
 *
 * 负责插件的注册、生命周期管理和依赖解析
 * 提供统一的插件管理能力，支持插件的热插拔和状态监控
 */
export interface IPluginManager {
  /**
   * 注册插件到管理器中
   * @param plugin 插件实例
   * @param config 插件配置参数（可选）
   * @throws 如果插件名称重复或依赖未满足时抛出异常
   */
  register(plugin: IPlugin, config?: Record<string, any>): void;

  /**
   * 从管理器中注销插件
   * @param name 插件名称
   * @throws 如果有其他插件依赖此插件时抛出异常
   */
  unregister(name: string): void;

  /**
   * 获取指定插件的注册信息
   * @param name 插件名称
   * @returns 插件注册信息，未找到时返回 undefined
   */
  get(name: string): PluginRegistration | undefined;

  /**
   * 获取所有已注册的插件信息
   * @returns 所有插件的注册信息数组
   */
  getAll(): PluginRegistration[];

  /**
   * 按依赖顺序初始化所有插件
   * @returns Promise，所有插件初始化完成后 resolve
   * @throws 如果任何插件初始化失败时抛出异常
   */
  initAll(): Promise<void>;

  /**
   * 按依赖顺序启动所有已初始化的插件
   * @returns Promise，所有插件启动完成后 resolve
   * @throws 如果任何插件启动失败时抛出异常
   */
  startAll(): Promise<void>;

  /**
   * 按依赖倒序停止所有已启动的插件
   * @returns Promise，所有插件停止完成后 resolve
   * @note 即使某个插件停止失败也会继续停止其他插件
   */
  stopAll(): Promise<void>;

  /**
   * 按依赖倒序销毁所有插件并清理资源
   * @returns Promise，所有插件销毁完成后 resolve
   * @note 即使某个插件销毁失败也会继续销毁其他插件
   */
  destroyAll(): Promise<void>;
}
