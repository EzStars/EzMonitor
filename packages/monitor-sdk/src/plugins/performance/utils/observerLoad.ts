import { TraceSubTypeEnum, TraceTypeEnum } from '../../../common/enum';
import { lazyReportBatch } from '../../../common/report';
import { PaintType } from '../../../types';

export default function observePageLoadTime() {
  // 记录页面加载开始的时间
  const startTimestamp = performance.now();

  // 监听 load 事件
  window.addEventListener('load', () => {
    // 记录 load 事件触发的时间
    const loadTimestamp = performance.now();

    // 计算从页面开始加载到 load 事件触发的时间差
    const loadTime = loadTimestamp - startTimestamp;

    // 构建性能数据对象
    const reportData: PaintType = {
      name: '',
      entryType: 'load',
      type: TraceTypeEnum.performance,
      subType: TraceSubTypeEnum.load,
      pageUrl: window.location.href,
      startTime: startTimestamp,
      duration: loadTime,
      timestamp: new Date().getTime(),
    };
    // 发送数据
    lazyReportBatch(reportData);
  });
}
