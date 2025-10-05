import { request } from '../request';
import type { PerformanceListParams, PaginationResponse } from '../types';

// 从 SDK 导入性能相关类型
import type {
  PaintType,
  resourceType,
  AjaxType,
  PerformanceResourceType,
} from '../../../../monitor-sdk/src/types';

// 统一的性能数据类型
export type PerformanceDataType =
  | PaintType
  | resourceType
  | AjaxType
  | PerformanceResourceType;

/**
 * 性能监控相关 API
 */
export const performanceApi = {
  /**
   * 获取性能数据列表
   */
  getPerformanceList: (
    params: PerformanceListParams,
  ): Promise<PaginationResponse<PerformanceDataType>> => {
    return request.get('/performance', { params });
  },

  /**
   * 获取页面性能概览
   */
  getPerformanceOverview: (params: {
    projectId: string;
    timeRange: string;
    pageUrl?: string;
  }): Promise<{
    // 页面加载性能指标
    pageMetrics: {
      fcp: number; // First Contentful Paint
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
      ttfb: number; // Time to First Byte
      domContentLoaded: number;
      loadComplete: number;
    };
    // 资源加载性能
    resourceMetrics: {
      totalResources: number;
      failedResources: number;
      avgLoadTime: number;
      slowResources: Array<{
        name: string;
        duration: number;
        size: number;
      }>;
    };
    // AJAX 请求性能
    ajaxMetrics: {
      totalRequests: number;
      failedRequests: number;
      avgResponseTime: number;
      slowRequests: Array<{
        url: string;
        duration: number;
        status: number;
      }>;
    };
  }> => {
    return request.get('/performance/overview', { params });
  },

  /**
   * 获取性能趋势数据
   */
  getPerformanceTrend: (params: {
    projectId: string;
    timeRange: string;
    metricType: 'fcp' | 'lcp' | 'fid' | 'cls' | 'ttfb';
  }): Promise<
    Array<{
      time: string;
      value: number;
      p50: number;
      p90: number;
      p99: number;
    }>
  > => {
    return request.get('/performance/trend', { params });
  },

  /**
   * 获取资源加载详情
   */
  getResourceDetails: (params: {
    projectId: string;
    timeRange: string;
    resourceType?: 'script' | 'css' | 'image' | 'font' | 'xhr' | 'fetch';
  }): Promise<
    Array<
      PerformanceResourceType & {
        count: number;
        avgDuration: number;
        successRate: number;
      }
    >
  > => {
    return request.get('/performance/resources', { params });
  },

  /**
   * 获取页面性能分析报告
   */
  getPerformanceReport: (params: {
    pageUrl: string;
    timeRange: string;
  }): Promise<{
    score: number; // 总体性能评分 (0-100)
    recommendations: Array<{
      type: 'optimization' | 'warning' | 'info';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      solution: string;
    }>;
    metrics: {
      [key: string]: {
        value: number;
        score: number;
        threshold: {
          good: number;
          needsImprovement: number;
        };
      };
    };
  }> => {
    return request.post('/performance/report', params);
  },

  /**
   * 获取核心 Web 指标统计
   */
  getCoreWebVitals: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    lcp: {
      good: number;
      needsImprovement: number;
      poor: number;
      p75: number;
    };
    fid: {
      good: number;
      needsImprovement: number;
      poor: number;
      p75: number;
    };
    cls: {
      good: number;
      needsImprovement: number;
      poor: number;
      p75: number;
    };
  }> => {
    return request.get('/performance/core-web-vitals', { params });
  },

  /**
   * 获取用户体验指标
   */
  getUserExperienceMetrics: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    bounceRate: number;
    avgSessionDuration: number;
    pageLoadSatisfaction: number;
    performanceScore: number;
    userSatisfactionTrend: Array<{
      time: string;
      satisfaction: number;
    }>;
  }> => {
    return request.get('/performance/user-experience', { params });
  },

  /**
   * 获取设备和浏览器性能分析
   */
  getDevicePerformanceAnalysis: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    byDevice: Array<{
      deviceType: string;
      avgLoadTime: number;
      performanceScore: number;
      userCount: number;
    }>;
    byBrowser: Array<{
      browser: string;
      version: string;
      avgLoadTime: number;
      performanceScore: number;
      userCount: number;
    }>;
    byNetwork: Array<{
      networkType: string;
      avgLoadTime: number;
      performanceScore: number;
      userCount: number;
    }>;
  }> => {
    return request.get('/performance/device-analysis', { params });
  },
};
