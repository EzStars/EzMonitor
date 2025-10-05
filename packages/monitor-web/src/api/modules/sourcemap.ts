import { request } from '../request';
import type { SourceMapResolveParams, SourceMapResolveResult } from '../types';

/**
 * SourceMap 相关 API
 */
export const sourceMapApi = {
  /**
   * 上传 SourceMap 文件
   */
  uploadSourceMap: (
    projectId: string,
    formData: FormData,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    uploadTime: string;
  }> => {
    return request.post(`/sourcemap/${projectId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 批量上传 SourceMap 文件
   */
  batchUploadSourceMap: (
    projectId: string,
    files: FormData,
  ): Promise<
    Array<{
      fileId: string;
      filename: string;
      size: number;
      uploadTime: string;
      status: 'success' | 'error';
      error?: string;
    }>
  > => {
    return request.post(`/sourcemap/${projectId}/batch-upload`, files, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 获取 SourceMap 文件列表
   */
  getSourceMapList: (
    projectId: string,
    params?: {
      page?: number;
      pageSize?: number;
      filename?: string;
    },
  ): Promise<{
    list: Array<{
      fileId: string;
      filename: string;
      originalFilename: string;
      size: number;
      uploadTime: string;
      version?: string;
      buildId?: string;
      status: 'active' | 'expired';
    }>;
    total: number;
  }> => {
    return request.get(`/sourcemap/${projectId}/list`, { params });
  },

  /**
   * 删除 SourceMap 文件
   */
  deleteSourceMap: (projectId: string, fileId: string): Promise<void> => {
    return request.delete(`/sourcemap/${projectId}/${fileId}`);
  },

  /**
   * 批量删除 SourceMap 文件
   */
  batchDeleteSourceMap: (
    projectId: string,
    fileIds: string[],
  ): Promise<void> => {
    return request.delete(`/sourcemap/${projectId}/batch`, {
      data: { fileIds },
    });
  },

  /**
   * 解析错误位置到源码位置
   */
  resolveSourceMap: (
    params: SourceMapResolveParams,
  ): Promise<SourceMapResolveResult> => {
    return request.post('/sourcemap/resolve', params);
  },

  /**
   * 批量解析错误位置
   */
  batchResolveSourceMap: (
    requests: SourceMapResolveParams[],
  ): Promise<SourceMapResolveResult[]> => {
    return request.post('/sourcemap/batch-resolve', { requests });
  },

  /**
   * 获取源码内容
   */
  getSourceContent: (params: {
    projectId: string;
    filename: string;
    startLine?: number;
    endLine?: number;
  }): Promise<{
    filename: string;
    content: string;
    totalLines: number;
    highlightLines?: number[];
  }> => {
    return request.get('/sourcemap/source-content', { params });
  },

  /**
   * 搜索 SourceMap 中的函数或变量
   */
  searchInSourceMap: (params: {
    projectId: string;
    keyword: string;
    type?: 'function' | 'variable' | 'class';
  }): Promise<
    Array<{
      filename: string;
      line: number;
      column: number;
      name: string;
      type: string;
      context: string;
    }>
  > => {
    return request.get('/sourcemap/search', { params });
  },

  /**
   * 获取 SourceMap 统计信息
   */
  getSourceMapStats: (
    projectId: string,
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    resolvedErrors: number;
    unresolvedErrors: number;
    coverageRate: number;
    topFiles: Array<{
      filename: string;
      errorCount: number;
      resolveCount: number;
      resolveRate: number;
    }>;
  }> => {
    return request.get(`/sourcemap/${projectId}/stats`);
  },

  /**
   * 验证 SourceMap 文件有效性
   */
  validateSourceMap: (
    projectId: string,
    fileId: string,
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    mappings: number;
    sources: string[];
  }> => {
    return request.post(`/sourcemap/${projectId}/${fileId}/validate`);
  },

  /**
   * 获取 SourceMap 配置
   */
  getSourceMapConfig: (
    projectId: string,
  ): Promise<{
    enabled: boolean;
    autoUpload: boolean;
    retentionDays: number;
    maxFileSize: number;
    allowedExtensions: string[];
    webhookUrl?: string;
    apiToken?: string;
  }> => {
    return request.get(`/sourcemap/${projectId}/config`);
  },

  /**
   * 更新 SourceMap 配置
   */
  updateSourceMapConfig: (
    projectId: string,
    config: {
      enabled?: boolean;
      autoUpload?: boolean;
      retentionDays?: number;
      maxFileSize?: number;
      allowedExtensions?: string[];
      webhookUrl?: string;
      apiToken?: string;
    },
  ): Promise<void> => {
    return request.put(`/sourcemap/${projectId}/config`, config);
  },

  /**
   * 生成 SourceMap 上传 token
   */
  generateUploadToken: (
    projectId: string,
    options?: {
      expiresIn?: number; // 过期时间（秒）
      maxUploads?: number; // 最大上传次数
    },
  ): Promise<{
    token: string;
    expiresAt: string;
    maxUploads: number;
  }> => {
    return request.post(`/sourcemap/${projectId}/token`, options);
  },

  /**
   * 撤销上传 token
   */
  revokeUploadToken: (projectId: string, token: string): Promise<void> => {
    return request.delete(`/sourcemap/${projectId}/token/${token}`);
  },
};
