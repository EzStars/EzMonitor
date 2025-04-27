//导入类型定义
import { MonitorOptions, MonitorEvent } from './types';
import reportData from '../report/index';
import PerformanceMonitor from '../plugins/performance/utils/index';
import { dataInterface } from '../report/types';

export class Monitor {
  private options: MonitorOptions;
  private performanceMonitor: PerformanceMonitor; // 持有性能监控实例
  private queue: MonitorEvent[] = []; // 事件队列

  constructor(options: MonitorOptions) {
    this.options = {
      delay: 1000,
      ...options,
    };
    this.performanceMonitor = new PerformanceMonitor(); // 初始化性能监控
    this.init();
  }

  //初始化会发送数据到数据库
  private init(): void {
    console.log('初始化监听。。。');

    // 延迟上报（确保性能数据已收集）
    setTimeout(() => {
      // 合并性能数据和其他数据（如错误）
      const reportPayload: dataInterface = {
        performance: this.performanceMonitor.getMetrics(),
        event: this.queue,
      };

      reportData({
        url: this.options.reportUrl,
        data: reportPayload, // 包含性能数据+其他数据
        delay: 0, // 立即发送（外层已有setTimeout）
      });
    }, this.options.delay);
    // 其他初始化逻辑（如错误监听）
  }
}
