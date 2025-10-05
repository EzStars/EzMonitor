import { request } from '../request';
import type { BehaviorListParams, PaginationResponse } from '../types';

// 从 SDK 导入行为相关类型
import type {
  PvInfoType,
  RouterChangeType,
  TargetInfoType,
  customAnalyticsData,
  RecordEventScope,
} from '../../../../monitor-sdk/src/types';

// 统一的行为数据类型
export type BehaviorDataType =
  | PvInfoType
  | RouterChangeType
  | TargetInfoType
  | customAnalyticsData;

/**
 * 行为监控相关 API
 */
export const behaviorApi = {
  /**
   * 获取用户行为数据列表
   */
  getBehaviorList: (
    params: BehaviorListParams,
  ): Promise<PaginationResponse<BehaviorDataType>> => {
    return request.get('/behavior', { params });
  },

  /**
   * 获取用户行为概览
   */
  getBehaviorOverview: (params: {
    projectId: string;
    timeRange: string;
    userId?: string;
  }): Promise<{
    totalUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: Array<{
      pageUrl: string;
      pv: number;
      uv: number;
      avgStayTime: number;
    }>;
    userActivityTrend: Array<{
      time: string;
      activeUsers: number;
      sessions: number;
    }>;
  }> => {
    return request.get('/behavior/overview', { params });
  },

  /**
   * 获取页面访问统计
   */
  getPageStats: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<
    Array<{
      pageUrl: string;
      title: string;
      pv: number;
      uv: number;
      avgStayTime: number;
      bounceRate: number;
      exitRate: number;
      loadTime: number;
    }>
  > => {
    return request.get('/behavior/pages', { params });
  },

  /**
   * 获取用户路径分析
   */
  getUserPath: (params: {
    projectId: string;
    timeRange: string;
    userId?: string;
  }): Promise<{
    pathFlow: Array<{
      from: string;
      to: string;
      count: number;
      conversionRate: number;
    }>;
    commonPaths: Array<{
      path: string[];
      userCount: number;
      avgDuration: number;
    }>;
  }> => {
    return request.get('/behavior/user-path', { params });
  },

  /**
   * 获取用户会话详情
   */
  getUserSession: (params: {
    userId: string;
    sessionId: string;
  }): Promise<{
    sessionInfo: {
      userId: string;
      sessionId: string;
      startTime: number;
      endTime: number;
      duration: number;
      pageCount: number;
      deviceInfo: any;
    };
    behaviorTimeline: Array<{
      timestamp: number;
      type: string;
      data: any;
      pageUrl: string;
    }>;
    performanceData: any[];
    errorEvents: any[];
  }> => {
    return request.get('/behavior/session', { params });
  },

  /**
   * 获取热点分析数据
   */
  getHeatmapData: (params: {
    pageUrl: string;
    timeRange: string;
    type: 'click' | 'scroll' | 'move';
  }): Promise<{
    clickHeatmap: Array<{
      x: number;
      y: number;
      count: number;
      element: string;
    }>;
    scrollHeatmap: Array<{
      scrollDepth: number;
      count: number;
      percentage: number;
    }>;
    attentionHeatmap: Array<{
      x: number;
      y: number;
      duration: number;
      element: string;
    }>;
  }> => {
    return request.get('/behavior/heatmap', { params });
  },

  /**
   * 获取自定义事件统计
   */
  getCustomEventStats: (params: {
    projectId: string;
    timeRange: string;
    eventKey?: string;
  }): Promise<
    Array<{
      eventKey: string;
      eventAction: string;
      totalCount: number;
      uniqueUsers: number;
      avgValue: number;
      conversionRate: number;
      trend: Array<{
        time: string;
        count: number;
      }>;
    }>
  > => {
    return request.get('/behavior/custom-events', { params });
  },

  /**
   * 获取转化漏斗分析
   */
  getFunnelAnalysis: (params: {
    projectId: string;
    timeRange: string;
    steps: Array<{
      name: string;
      condition: string;
    }>;
  }): Promise<{
    steps: Array<{
      name: string;
      userCount: number;
      conversionRate: number;
      dropOffRate: number;
    }>;
    conversionTrend: Array<{
      time: string;
      conversionRate: number;
    }>;
  }> => {
    return request.post('/behavior/funnel', params);
  },

  /**
   * 获取用户留存分析
   */
  getRetentionAnalysis: (params: {
    projectId: string;
    timeRange: string;
    cohortType: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    cohorts: Array<{
      cohortDate: string;
      userCount: number;
      retention: number[];
    }>;
    avgRetention: number[];
  }> => {
    return request.get('/behavior/retention', { params });
  },

  /**
   * 获取用户行为录屏
   */
  getBehaviorRecording: (params: {
    userId: string;
    sessionId: string;
    timeRange?: {
      start: number;
      end: number;
    };
  }): Promise<{
    recordingUrl: string;
    events: RecordEventScope[];
    duration: number;
  }> => {
    return request.get('/behavior/recording', { params });
  },

  /**
   * 获取用户画像数据
   */
  getUserProfile: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    demographics: {
      deviceTypes: Array<{ type: string; count: number; percentage: number }>;
      browsers: Array<{ browser: string; count: number; percentage: number }>;
      operatingSystems: Array<{
        os: string;
        count: number;
        percentage: number;
      }>;
      locations: Array<{ location: string; count: number; percentage: number }>;
    };
    behaviorPatterns: {
      avgSessionDuration: number;
      avgPagesPerSession: number;
      peakHours: Array<{ hour: number; activeUsers: number }>;
      frequentUsers: number;
      newUsers: number;
      returningUsers: number;
    };
  }> => {
    return request.get('/behavior/user-profile', { params });
  },
};
