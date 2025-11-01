import { getConfig } from '../../../config';
import { TraceSubTypeEnum, TraceTypeEnum } from '../../../common/enum';
import { lazyReportBatch } from '../../../common/report';
import { PerformanceResourceType, resourceType } from '../../../types';

/**
 * 监听所有资源加载情况
 */
export default function observerEntries() {
  if (document.readyState === 'complete') {
    observerEvent();
  } else {
    const onLoad = () => {
      observerEvent();
      window.removeEventListener('load', onLoad, true);
    };
    window.addEventListener('load', onLoad, true);
  }
}
/**
 * 观察页面资源加载事件
 */
export function observerEvent() {
  // 获取配置信息
  const config = getConfig();
  // 从配置中获取URL
  const url = config.url;
  // 解析URL
  const parsedUrl = new URL(url);
  // 获取主机名
  const host = parsedUrl.host;

  // 定义一个处理性能观察器条目的函数
  const entryHandler = (list: PerformanceObserverEntryList) => {
    // 创建一个空的数组来存储数据
    const dataList: PerformanceResourceType[] = [];
    // 获取所有条目
    const entries = list.getEntries();
    // 遍历所有条目
    for (let i = 0; i < entries.length; i++) {
      // 将条目转换为PerformanceResourceTiming类型
      const resourceEntry = entries[i] as PerformanceResourceTiming;

      // 避免sdk自己发的请求又被上报无限循环
      // 如果条目的名称包含主机名，则跳过该条目
      if (resourceEntry.name.includes(host)) {
        continue;
      }
      // 创建一个对象来存储性能数据
      const data: PerformanceResourceType = {
        type: TraceTypeEnum.performance, // 类型
        subType: resourceEntry.entryType, // 类型
        name: resourceEntry.name, // 资源的名字
        sourceType: resourceEntry.initiatorType, // 资源类型
        duration: resourceEntry.duration, // 加载时间
        dns: resourceEntry.domainLookupEnd - resourceEntry.domainLookupStart, // dns解析时间
        tcp: resourceEntry.connectEnd - resourceEntry.connectStart, // tcp连接时间
        redirect: resourceEntry.redirectEnd - resourceEntry.redirectStart, // 重定向时间
        ttfb: resourceEntry.responseStart, // 首字节时间
        protocol: resourceEntry.nextHopProtocol, // 请求协议
        responseBodySize: resourceEntry.encodedBodySize, // 响应内容大小
        responseHeaderSize:
          resourceEntry.transferSize - resourceEntry.encodedBodySize, // 响应头部大小
        transferSize: resourceEntry.transferSize, // 请求内容大小
        resourceSize: resourceEntry.decodedBodySize, // 资源解压后的大小
        startTime: resourceEntry.startTime, // 资源开始加载的时间
        pageUrl: window.location.href, // 页面地址
        timestamp: new Date().getTime(), // 时间戳
      };
      // 将数据添加到数据列表中
      dataList.push(data);
      // 如果当前条目是最后一个条目，则发送报告
      if (i === entries.length - 1) {
        // 创建一个对象来存储要报告的资源数据
        const reportData: resourceType = {
          type: TraceTypeEnum.performance, // 类型
          subType: TraceSubTypeEnum.resource, // 类型
          resourceList: dataList, // 资源列表
          timestamp: new Date().getTime(), // 时间戳
        };
        // 延迟批量报告数据
        lazyReportBatch(reportData);
      }
    }
  };

  // 创建一个性能观察器
  const observer = new PerformanceObserver(entryHandler);
  // 开始观察类型为'resource'的条目，并启用缓冲
  observer.observe({ type: 'resource', buffered: true });
}
