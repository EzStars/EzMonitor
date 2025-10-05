/**
 * 性能监控基础数据结构
 */
export interface BasePerformanceData {
  id: string;
  appId: string;
  userId: string;
  type: 'performance';
  timestamp: number;
  pageUrl: string;
  userAgent?: string;
  ip?: string;
}

/**
 * FP (First Paint) - 首次绘制
 */
export interface FPData extends BasePerformanceData {
  subType: 'fp';
  startTime: number; // FP 时间
  duration: number; // 耗时
}

/**
 * FCP (First Contentful Paint) - 首次内容绘制
 */
export interface FCPData extends BasePerformanceData {
  subType: 'fcp';
  startTime: number;
  duration: number;
}

/**
 * LCP (Largest Contentful Paint) - 最大内容绘制
 */
export interface LCPData extends BasePerformanceData {
  subType: 'lcp';
  startTime: number;
  duration: number;
  size: number; // 元素大小
  element?: string; // 元素标签
}

/**
 * Load - 页面完全加载
 */
export interface LoadData extends BasePerformanceData {
  subType: 'load';
  startTime: number;
  duration: number; // 页面加载总耗时
  // DNS 解析
  dns?: number;
  // TCP 连接
  tcp?: number;
  // SSL 握手
  ssl?: number;
  // TTFB (Time to First Byte) - 首字节时间
  ttfb?: number;
  // 资源下载
  trans?: number;
  // DOM 解析
  domParse?: number;
  // 资源加载
  res?: number;
}

/**
 * Fetch 请求
 */
export interface FetchData extends BasePerformanceData {
  subType: 'fetch';
  name: string; // 请求 URL
  method: string; // 请求方法
  duration: number; // 请求耗时
  startTime: number;
  status: number; // 响应状态码
  statusText?: string; // 响应状态文本
  params?: string; // 请求参数 (JSON 字符串)
  response?: string; // 响应数据 (JSON 字符串，可选)
}

/**
 * XHR 请求
 */
export interface XHRData extends BasePerformanceData {
  subType: 'xhr';
  name: string; // 请求 URL
  method: string; // 请求方法
  duration: number; // 请求耗时
  startTime: number;
  status: number; // 响应状态码
  statusText?: string;
  params?: string; // 请求参数
  response?: string; // 响应数据
}

/**
 * 资源加载 (CSS/JS/Image/Font 等)
 */
export interface ResourceData extends BasePerformanceData {
  subType: 'resource';
  name: string; // 资源 URL
  initiatorType: string; // 资源类型: script, link, img, css, fetch, xmlhttprequest
  duration: number; // 加载耗时
  startTime: number;
  // 详细时间
  dns?: number; // DNS 查询时间
  tcp?: number; // TCP 连接时间
  ttfb?: number; // 首字节时间
  protocol?: string; // 协议 (http/1.1, h2, h3)
  // 资源大小
  transferSize?: number; // 传输大小 (包含 header)
  encodedBodySize?: number; // 压缩后大小
  decodedBodySize?: number; // 解压后大小
}

/**
 * 所有性能数据类型的联合类型
 */
export type PerformanceData =
  | FPData
  | FCPData
  | LCPData
  | LoadData
  | FetchData
  | XHRData
  | ResourceData;

/**
 * 性能统计数据
 */
export interface PerformanceStats {
  // 核心 Web Vitals
  fp: number; // First Paint 平均值
  fcp: number; // First Contentful Paint 平均值
  lcp: number; // Largest Contentful Paint 平均值

  // 页面加载
  loadTime: number; // 页面完全加载平均时间
  dnsTime: number; // DNS 平均解析时间
  tcpTime: number; // TCP 平均连接时间
  ttfbTime: number; // 首字节平均时间

  // 接口请求
  fetchCount: number; // Fetch 请求总数
  xhrCount: number; // XHR 请求总数
  avgFetchTime: number; // Fetch 平均耗时
  avgXhrTime: number; // XHR 平均耗时
  slowRequestCount: number; // 慢请求数量 (>1s)
  errorRequestCount: number; // 错误请求数量 (4xx/5xx)

  // 资源加载
  resourceCount: number; // 资源总数
  avgResourceTime: number; // 资源平均加载时间
  slowResourceCount: number; // 慢资源数量 (>500ms)

  // 资源类型分布
  resourceTypeCount: {
    script: number;
    link: number;
    img: number;
    css: number;
    fetch: number;
    xmlhttprequest: number;
    other: number;
  };
}
