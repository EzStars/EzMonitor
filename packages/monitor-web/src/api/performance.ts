/**
 * 性能监控相关 API
 */

import { get } from './index';
import type {
  PerformanceData,
  PerformanceStats,
  GetPerformanceListParams,
  GetPerformanceListResponse,
  GetPerformanceStatsParams,
  GetPerformanceTrendParams,
  GetPerformanceTrendResponse,
} from '../types/performance';

/**
 * 获取性能数据列表
 * @param params 查询参数
 * @returns 性能数据列表
 */
export async function getPerformanceList(
  params: GetPerformanceListParams,
): Promise<GetPerformanceListResponse> {
  const response = await get<GetPerformanceListResponse>(
    '/api/monitor/performance/list',
    params as Record<string, any>,
  );
  return response.data;
}

/**
 * 获取性能统计数据
 * @param params 查询参数
 * @returns 性能统计数据
 */
export async function getPerformanceStats(
  params: GetPerformanceStatsParams,
): Promise<PerformanceStats> {
  const response = await get<PerformanceStats>(
    '/api/monitor/performance/stats',
    params as Record<string, any>,
  );
  return response.data;
}

/**
 * 获取性能趋势数据
 * @param params 查询参数
 * @returns 性能趋势数据
 */
export async function getPerformanceTrend(
  params: GetPerformanceTrendParams,
): Promise<GetPerformanceTrendResponse> {
  const response = await get<GetPerformanceTrendResponse>(
    '/api/monitor/performance/trend',
    params as Record<string, any>,
  );
  return response.data;
}

/**
 * 获取指定类型的性能数据
 * @param appId 应用ID
 * @param subType 性能数据子类型
 * @param limit 返回数量限制
 * @returns 性能数据列表
 */
export async function getPerformanceByType(
  appId: string,
  subType: string,
  limit: number = 50,
): Promise<PerformanceData[]> {
  const response = await getPerformanceList({
    appId,
    subType,
    limit,
  });
  return response.list;
}

/**
 * 获取页面加载性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns 页面加载性能数据列表
 */
export async function getPageLoadPerformance(
  appId: string,
  limit: number = 20,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'load', limit);
}

/**
 * 获取FCP性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns FCP性能数据列表
 */
export async function getFCPPerformance(
  appId: string,
  limit: number = 20,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'fcp', limit);
}

/**
 * 获取LCP性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns LCP性能数据列表
 */
export async function getLCPPerformance(
  appId: string,
  limit: number = 20,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'lcp', limit);
}

/**
 * 获取Fetch请求性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns Fetch请求性能数据列表
 */
export async function getFetchPerformance(
  appId: string,
  limit: number = 50,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'fetch', limit);
}

/**
 * 获取XHR请求性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns XHR请求性能数据列表
 */
export async function getXHRPerformance(
  appId: string,
  limit: number = 50,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'xhr', limit);
}

/**
 * 获取资源加载性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns 资源加载性能数据列表
 */
export async function getResourcePerformance(
  appId: string,
  limit: number = 100,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'resource', limit);
}

/**
 * 获取长任务性能数据
 * @param appId 应用ID
 * @param limit 返回数量限制
 * @returns 长任务性能数据列表
 */
export async function getLongTaskPerformance(
  appId: string,
  limit: number = 50,
): Promise<PerformanceData[]> {
  return getPerformanceByType(appId, 'long-task', limit);
}
