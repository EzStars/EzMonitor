/**
 * API 接口相关类型定义
 * 基于 monitor-sdk 的数据类型定义相应的接口请求/响应类型
 */

// 通用响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

// 分页请求参数
export interface PaginationParams {
  pageNum: number;
  pageSize: number;
  startTime?: string;
  endTime?: string;
}

// 分页响应数据
export interface PaginationResponse<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// 错误数据相关类型
export interface ErrorListParams extends PaginationParams {
  projectId?: string;
  errorType?: 'js' | 'resource' | 'promise' | 'vue' | 'react';
  status?: 'pending' | 'resolved';
  keyword?: string;
}

export interface ErrorDetailParams {
  errorId: string;
}

// 性能数据相关类型
export interface PerformanceListParams extends PaginationParams {
  projectId?: string;
  performanceType?: 'paint' | 'resource' | 'ajax';
  pageUrl?: string;
}

// 行为数据相关类型
export interface BehaviorListParams extends PaginationParams {
  projectId?: string;
  behaviorType?: 'click' | 'pv' | 'router' | 'custom';
  userId?: string;
  pageUrl?: string;
}

// 异常监控相关类型
export interface ExceptionListParams extends PaginationParams {
  projectId?: string;
  exceptionType?: 'whiteScreen' | 'stutter' | 'crash';
  pageUrl?: string;
}

// 项目统计相关类型
export interface ProjectStatsParams {
  projectId: string;
  timeRange: '1h' | '1d' | '7d' | '30d';
}

export interface ProjectStats {
  errorCount: number;
  performanceScore: number;
  userCount: number;
  pageViews: number;
  crashRate: number;
  errorTrend: Array<{
    time: string;
    count: number;
  }>;
  performanceTrend: Array<{
    time: string;
    score: number;
  }>;
}

// SourceMap 相关类型
export interface SourceMapResolveParams {
  filename: string;
  line: number;
  column: number;
  projectId: string;
}

export interface SourceMapResolveResult {
  originalFile: string;
  originalLine: number;
  originalColumn: number;
  originalSource: string;
  functionName?: string;
}
