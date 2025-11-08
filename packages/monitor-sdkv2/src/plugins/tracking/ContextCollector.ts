import type { TrackingContext } from './types';

/**
 * 埋点上下文收集器
 * 负责收集页面、设备、网络等上下文信息
 */
export class ContextCollector {
  private customContext: Record<string, any> = {};

  /**
   * 收集完整的上下文信息
   */
  collect(): TrackingContext {
    return {
      page: this.collectPageInfo(),
      device: this.collectDeviceInfo(),
      network: this.collectNetworkInfo(),
      custom: { ...this.customContext },
    };
  }

  /**
   * 设置自定义上下文
   */
  setCustomContext(context: Record<string, any>): void {
    this.customContext = { ...this.customContext, ...context };
  }

  /**
   * 移除自定义上下文
   */
  removeCustomContext(key: string): void {
    delete this.customContext[key];
  }

  /**
   * 清空自定义上下文
   */
  clearCustomContext(): void {
    this.customContext = {};
  }

  /**
   * 收集页面信息
   */
  private collectPageInfo() {
    if (typeof window === 'undefined') return undefined;

    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || undefined,
    };
  }

  /**
   * 收集设备信息
   */
  private collectDeviceInfo() {
    if (typeof window === 'undefined') return undefined;

    return {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * 收集网络信息
   */
  private collectNetworkInfo() {
    if (typeof window === 'undefined' || !('connection' in navigator))
      return undefined;

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
    };
  }
}
