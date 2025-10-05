import { request } from '../request';
import type { ExceptionListParams, PaginationResponse } from '../types';

// 从 SDK 导入异常相关类型
import type {
  whiteScreenType,
  stutterStype,
  CrashType,
} from '../../../../monitor-sdk/src/types';

// 统一的异常数据类型
export type ExceptionDataType = whiteScreenType | stutterStype | CrashType;

/**
 * 异常监控相关 API
 */
export const exceptionApi = {
  /**
   * 获取异常数据列表
   */
  getExceptionList: (
    params: ExceptionListParams,
  ): Promise<PaginationResponse<ExceptionDataType>> => {
    return request.get('/exceptions', { params });
  },

  /**
   * 获取异常概览统计
   */
  getExceptionOverview: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    totalExceptions: number;
    whiteScreenCount: number;
    stutterCount: number;
    crashCount: number;
    affectedUsers: number;
    exceptionTrend: Array<{
      time: string;
      whiteScreen: number;
      stutter: number;
      crash: number;
    }>;
    severityDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> => {
    return request.get('/exceptions/overview', { params });
  },

  /**
   * 获取白屏检测详情
   */
  getWhiteScreenDetails: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<
    Array<
      whiteScreenType & {
        duration: number;
        affectedUsers: number;
        recoveryTime?: number;
        triggerElement?: string;
      }
    >
  > => {
    return request.get('/exceptions/white-screen', { params });
  },

  /**
   * 获取卡顿检测详情
   */
  getStutterDetails: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<
    Array<
      stutterStype & {
        duration: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
        frameDrops: number;
        cpuUsage?: number;
        memoryUsage?: number;
      }
    >
  > => {
    return request.get('/exceptions/stutter', { params });
  },

  /**
   * 获取崩溃检测详情
   */
  getCrashDetails: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<
    Array<
      CrashType & {
        crashType: 'js-error' | 'memory-leak' | 'network-error' | 'unknown';
        severity: 'low' | 'medium' | 'high' | 'critical';
        affectedFeatures: string[];
        recoveryPossible: boolean;
      }
    >
  > => {
    return request.get('/exceptions/crash', { params });
  },

  /**
   * 获取异常影响分析
   */
  getExceptionImpactAnalysis: (params: {
    exceptionId: string;
    type: 'whiteScreen' | 'stutter' | 'crash';
  }): Promise<{
    userImpact: {
      affectedUsers: number;
      totalUsers: number;
      impactRate: number;
    };
    businessImpact: {
      lostSessions: number;
      bounceRateIncrease: number;
      conversionRateDecrease: number;
    };
    technicalImpact: {
      performanceDegrade: number;
      errorRateIncrease: number;
      systemResourceUsage: number;
    };
    timeline: Array<{
      timestamp: number;
      event: string;
      description: string;
    }>;
  }> => {
    return request.get(
      `/exceptions/${params.type}/${params.exceptionId}/impact`,
    );
  },

  /**
   * 获取异常根因分析
   */
  getExceptionRootCause: (params: {
    exceptionId: string;
    type: 'whiteScreen' | 'stutter' | 'crash';
  }): Promise<{
    probableCauses: Array<{
      cause: string;
      probability: number;
      evidence: string[];
      solution: string;
    }>;
    relatedErrors: Array<{
      errorId: string;
      message: string;
      correlation: number;
    }>;
    environmentFactors: {
      device: any;
      browser: any;
      network: any;
      performance: any;
    };
    codeAnalysis: {
      suspiciousFiles: string[];
      recentChanges: Array<{
        file: string;
        changeTime: string;
        author: string;
      }>;
    };
  }> => {
    return request.get(
      `/exceptions/${params.type}/${params.exceptionId}/root-cause`,
    );
  },

  /**
   * 获取异常预警配置
   */
  getAlertConfig: (
    projectId: string,
  ): Promise<{
    whiteScreen: {
      enabled: boolean;
      threshold: number;
      duration: number;
      recipients: string[];
    };
    stutter: {
      enabled: boolean;
      threshold: number;
      duration: number;
      recipients: string[];
    };
    crash: {
      enabled: boolean;
      threshold: number;
      duration: number;
      recipients: string[];
    };
  }> => {
    return request.get(`/exceptions/alert-config/${projectId}`);
  },

  /**
   * 更新异常预警配置
   */
  updateAlertConfig: (
    projectId: string,
    config: {
      whiteScreen?: {
        enabled: boolean;
        threshold: number;
        duration: number;
        recipients: string[];
      };
      stutter?: {
        enabled: boolean;
        threshold: number;
        duration: number;
        recipients: string[];
      };
      crash?: {
        enabled: boolean;
        threshold: number;
        duration: number;
        recipients: string[];
      };
    },
  ): Promise<void> => {
    return request.put(`/exceptions/alert-config/${projectId}`, config);
  },

  /**
   * 获取异常健康度评分
   */
  getHealthScore: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    overallScore: number;
    scores: {
      stability: number;
      performance: number;
      userExperience: number;
    };
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
      recommendation: string;
    }>;
    trend: Array<{
      time: string;
      score: number;
    }>;
  }> => {
    return request.get('/exceptions/health-score', { params });
  },

  /**
   * 标记异常为已处理
   */
  resolveException: (
    exceptionId: string,
    type: 'whiteScreen' | 'stutter' | 'crash',
  ): Promise<void> => {
    return request.patch(`/exceptions/${type}/${exceptionId}/resolve`);
  },

  /**
   * 忽略异常
   */
  ignoreException: (
    exceptionId: string,
    type: 'whiteScreen' | 'stutter' | 'crash',
  ): Promise<void> => {
    return request.patch(`/exceptions/${type}/${exceptionId}/ignore`);
  },
};
