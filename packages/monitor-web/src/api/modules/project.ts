import { request } from '../request';
import type { ProjectStatsParams, ProjectStats } from '../types';

/**
 * 项目相关 API
 */
export const projectApi = {
  /**
   * 获取项目列表
   */
  getProjectList: (): Promise<
    Array<{
      id: string;
      name: string;
      appId: string;
      description?: string;
      status: 'active' | 'inactive';
      createdAt: string;
      updatedAt: string;
      owner: string;
      memberCount: number;
    }>
  > => {
    return request.get('/projects');
  },

  /**
   * 获取项目详情
   */
  getProjectDetail: (
    projectId: string,
  ): Promise<{
    id: string;
    name: string;
    appId: string;
    description?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
    owner: string;
    settings: {
      errorMonitoring: boolean;
      performanceMonitoring: boolean;
      behaviorMonitoring: boolean;
      exceptionMonitoring: boolean;
      sampleRate: number;
      retentionDays: number;
    };
    members: Array<{
      userId: string;
      username: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      joinedAt: string;
    }>;
  }> => {
    return request.get(`/projects/${projectId}`);
  },

  /**
   * 创建项目
   */
  createProject: (data: {
    name: string;
    description?: string;
    settings?: {
      errorMonitoring?: boolean;
      performanceMonitoring?: boolean;
      behaviorMonitoring?: boolean;
      exceptionMonitoring?: boolean;
      sampleRate?: number;
      retentionDays?: number;
    };
  }): Promise<{
    id: string;
    appId: string;
    name: string;
  }> => {
    return request.post('/projects', data);
  },

  /**
   * 更新项目信息
   */
  updateProject: (
    projectId: string,
    data: {
      name?: string;
      description?: string;
      status?: 'active' | 'inactive';
      settings?: {
        errorMonitoring?: boolean;
        performanceMonitoring?: boolean;
        behaviorMonitoring?: boolean;
        exceptionMonitoring?: boolean;
        sampleRate?: number;
        retentionDays?: number;
      };
    },
  ): Promise<void> => {
    return request.put(`/projects/${projectId}`, data);
  },

  /**
   * 删除项目
   */
  deleteProject: (projectId: string): Promise<void> => {
    return request.delete(`/projects/${projectId}`);
  },

  /**
   * 获取项目统计数据
   */
  getProjectStats: (params: ProjectStatsParams): Promise<ProjectStats> => {
    return request.get(`/projects/${params.projectId}/stats`, {
      params: { timeRange: params.timeRange },
    });
  },

  /**
   * 获取项目概览仪表板数据
   */
  getProjectDashboard: (
    projectId: string,
    timeRange: string,
  ): Promise<{
    overview: {
      totalUsers: number;
      totalSessions: number;
      totalErrors: number;
      avgPerformanceScore: number;
      healthScore: number;
    };
    trends: {
      userTrend: Array<{ time: string; count: number }>;
      errorTrend: Array<{ time: string; count: number }>;
      performanceTrend: Array<{ time: string; score: number }>;
    };
    topErrors: Array<{
      errorId: string;
      message: string;
      count: number;
      affectedUsers: number;
    }>;
    slowestPages: Array<{
      pageUrl: string;
      avgLoadTime: number;
      pv: number;
    }>;
    criticalAlerts: Array<{
      type: string;
      message: string;
      timestamp: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  }> => {
    return request.get(`/projects/${projectId}/dashboard`, {
      params: { timeRange },
    });
  },

  /**
   * 获取项目成员列表
   */
  getProjectMembers: (
    projectId: string,
  ): Promise<
    Array<{
      userId: string;
      username: string;
      email: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      joinedAt: string;
      lastActiveAt: string;
    }>
  > => {
    return request.get(`/projects/${projectId}/members`);
  },

  /**
   * 邀请项目成员
   */
  inviteMember: (
    projectId: string,
    data: {
      email: string;
      role: 'admin' | 'member' | 'viewer';
    },
  ): Promise<void> => {
    return request.post(`/projects/${projectId}/members/invite`, data);
  },

  /**
   * 更新成员角色
   */
  updateMemberRole: (
    projectId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer',
  ): Promise<void> => {
    return request.put(`/projects/${projectId}/members/${userId}/role`, {
      role,
    });
  },

  /**
   * 移除项目成员
   */
  removeMember: (projectId: string, userId: string): Promise<void> => {
    return request.delete(`/projects/${projectId}/members/${userId}`);
  },

  /**
   * 获取项目 API 密钥
   */
  getApiKeys: (
    projectId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      key: string;
      permissions: string[];
      createdAt: string;
      lastUsedAt?: string;
      isActive: boolean;
    }>
  > => {
    return request.get(`/projects/${projectId}/api-keys`);
  },

  /**
   * 创建 API 密钥
   */
  createApiKey: (
    projectId: string,
    data: {
      name: string;
      permissions: string[];
    },
  ): Promise<{
    id: string;
    key: string;
  }> => {
    return request.post(`/projects/${projectId}/api-keys`, data);
  },

  /**
   * 撤销 API 密钥
   */
  revokeApiKey: (projectId: string, keyId: string): Promise<void> => {
    return request.delete(`/projects/${projectId}/api-keys/${keyId}`);
  },

  /**
   * 获取项目配置
   */
  getProjectConfig: (
    projectId: string,
  ): Promise<{
    monitoring: {
      errorMonitoring: boolean;
      performanceMonitoring: boolean;
      behaviorMonitoring: boolean;
      exceptionMonitoring: boolean;
    };
    sampling: {
      errorSampleRate: number;
      performanceSampleRate: number;
      behaviorSampleRate: number;
    };
    alerts: {
      errorThreshold: number;
      performanceThreshold: number;
      exceptionThreshold: number;
      recipients: string[];
    };
    retention: {
      errorRetentionDays: number;
      performanceRetentionDays: number;
      behaviorRetentionDays: number;
    };
    sourceMap: {
      enabled: boolean;
      uploadEndpoint?: string;
      deleteAfterDays?: number;
    };
  }> => {
    return request.get(`/projects/${projectId}/config`);
  },

  /**
   * 更新项目配置
   */
  updateProjectConfig: (projectId: string, config: any): Promise<void> => {
    return request.put(`/projects/${projectId}/config`, config);
  },
};
