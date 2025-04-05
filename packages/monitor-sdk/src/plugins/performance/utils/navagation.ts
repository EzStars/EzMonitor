// navigation.ts
export function observeNavigationTiming(
  metrics: Record<string, any>,
  observers: PerformanceObserver[],
): void {
  try {
    const navigationObserver = new PerformanceObserver(list => {
      const entries = list.getEntries() as PerformanceNavigationTiming[];
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          if (!metrics.navigation) {
            metrics.navigation = {};
          }

          // 计算性能时间指标
          const dnsLookupTime = entry.domainLookupEnd - entry.domainLookupStart;
          const tcpConnectionTime = entry.connectEnd - entry.connectStart;
          const ttfb = entry.responseStart - entry.requestStart; // 首次字节时间
          const domContentLoadedTime =
            entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
          const loadTime = entry.loadEventEnd - entry.loadEventStart;

          Object.assign(metrics, {
            // 重定向次数：在导航到当前页面之前发生的 HTTP 重定向的次数
            redirectCount: entry.redirectCount,
            // 开始获取资源的时间：浏览器开始获取当前页面资源的时间戳，这是整个导航过程的起始点
            fetchStart: entry.fetchStart,
            // DNS 查找开始时间：浏览器开始进行 DNS 查找以解析当前页面域名的时间戳
            domainLookupStart: entry.domainLookupStart,
            // DNS 查找结束时间：浏览器完成 DNS 查找，得到域名对应的 IP 地址的时间戳
            domainLookupEnd: entry.domainLookupEnd,
            // TCP 连接开始时间：浏览器开始尝试与服务器建立 TCP 连接的时间戳
            connectStart: entry.connectStart,
            // TCP 连接结束时间：浏览器成功与服务器建立 TCP 连接的时间戳
            connectEnd: entry.connectEnd,
            // 安全连接开始时间：如果使用了 HTTPS，该时间戳表示浏览器开始建立安全连接（如 TLS 握手）的时间；若为 HTTP 连接，值为 0
            secureConnectionStart: entry.secureConnectionStart,
            // 请求开始时间：浏览器向服务器发送 HTTP 请求的时间戳
            requestStart: entry.requestStart,
            // 响应开始时间：浏览器从服务器接收到第一个字节的响应数据的时间戳
            responseStart: entry.responseStart,
            // 响应结束时间：浏览器从服务器接收到最后一个字节的响应数据的时间戳
            responseEnd: entry.responseEnd,
            // DOM 可交互时间：文档解析完成，变为可交互状态的时间戳，此时文档的 DOM 树已经构建完成，但可能还有一些子资源（如图片、脚本等）正在加载
            domInteractive: entry.domInteractive,
            // DOMContentLoaded 事件开始时间：`DOMContentLoaded` 事件开始触发的时间戳，此事件在文档的 DOM 树构建完成且所有脚本都已执行后触发
            domContentLoadedEventStart: entry.domContentLoadedEventStart,
            // DOMContentLoaded 事件结束时间：`DOMContentLoaded` 事件处理完成的时间戳
            domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
            // DOM 加载完成时间：文档完全加载和解析完成，所有子资源（如图片、样式表等）也都已加载完成的时间戳
            domComplete: entry.domComplete,
            // load 事件开始时间：`load` 事件开始触发的时间戳，`load` 事件在页面的所有资源（包括图片、脚本等）都加载完成后触发
            loadEventStart: entry.loadEventStart,
            // load 事件结束时间：`load` 事件处理完成的时间戳
            loadEventEnd: entry.loadEventEnd,
            // DNS 查找时间：DNS 查找过程所花费的时间，即 DNS 查找结束时间减去 DNS 查找开始时间
            dnsLookupTime,
            // TCP 连接时间：TCP 连接建立过程所花费的时间，即 TCP 连接结束时间减去 TCP 连接开始时间
            tcpConnectionTime,
            // 首次字节时间（Time To First Byte）：从浏览器发送请求到接收到服务器第一个字节响应所花费的时间，即响应开始时间减去请求开始时间
            ttfb,
            // DOMContentLoaded 事件持续时间：`DOMContentLoaded` 事件从开始到结束所花费的时间，即 DOMContentLoaded 事件结束时间减去 DOMContentLoaded 事件开始时间
            domContentLoadedTime,
            // 页面加载时间：`load` 事件从开始到结束所花费的时间，即 load 事件结束时间减去 load 事件开始时间
            loadTime,
          });

          console.log('导航性能数据:', metrics);
        }
      });
    });
    navigationObserver.observe({ type: 'navigation', buffered: true });
    observers.push(navigationObserver);
  } catch (error) {
    console.error('导航性能监控初始化失败:', error);
  }
}
