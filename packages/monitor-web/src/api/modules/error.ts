import { request } from '../request';
import type {
  ErrorListParams,
  ErrorDetailParams,
  PaginationResponse,
} from '../types';

// 从 SDK 导入错误相关类型
import type {
  JsErrorType,
  ResourceErrorType,
  PromiseErrorType,
  VueErrorType,
  ReactErrorType,
} from '../../../../monitor-sdk/src/types';

// 统一的错误类型
export type ErrorDataType =
  | JsErrorType
  | ResourceErrorType
  | PromiseErrorType
  | VueErrorType
  | ReactErrorType;

/**
 * 错误监控相关 API
 */
export const errorApi = {
  /**
   * 获取错误列表
   */
  getErrorList: (
    params: ErrorListParams,
  ): Promise<PaginationResponse<ErrorDataType>> => {
    return request.get('/errors', { params });
  },

  /**
   * 获取错误详情
   */
  getErrorDetail: (params: ErrorDetailParams): Promise<ErrorDataType> => {
    return request.get(`/errors/${params.errorId}`);
  },

  /**
   * 获取错误统计数据
   */
  getErrorStats: (params: {
    projectId: string;
    timeRange: string;
  }): Promise<{
    totalErrors: number;
    jsErrors: number;
    resourceErrors: number;
    promiseErrors: number;
    vueErrors: number;
    reactErrors: number;
    errorTrend: Array<{
      time: string;
      count: number;
      type: string;
    }>;
  }> => {
    return request.get('/errors/stats', { params });
  },

  /**
   * 标记错误为已解决
   */
  resolveError: (errorId: string): Promise<void> => {
    return request.patch(`/errors/${errorId}/resolve`);
  },

  /**
   * 批量标记错误为已解决
   */
  batchResolveErrors: (errorIds: string[]): Promise<void> => {
    return request.patch('/errors/batch-resolve', { errorIds });
  },

  /**
   * 获取错误的 SourceMap 解析结果
   */
  getSourceMapInfo: (params: {
    errorId: string;
    filename: string;
    line: number;
    column: number;
  }): Promise<{
    originalFile: string;
    originalLine: number;
    originalColumn: number;
    originalSource: string;
    functionName?: string;
  }> => {
    return request.post('/errors/sourcemap', params);
  },

  /**
   * 获取错误关联的用户行为轨迹
   */
  getErrorBehaviorTrace: (
    errorId: string,
  ): Promise<
    Array<{
      timestamp: number;
      type: string;
      data: any;
    }>
  > => {
    return request.get(`/errors/${errorId}/behavior-trace`);
  },

  /**
   * 获取错误发生时的页面截图或录屏
   */
  getErrorRecording: (
    errorId: string,
  ): Promise<{
    screenshots: string[];
    recording?: string;
  }> => {
    return request.get(`/errors/${errorId}/recording`);
  },

  /**
   * 删除错误记录
   */
  deleteError: (errorId: string): Promise<void> => {
    return request.delete(`/errors/${errorId}`);
  },

  /**
   * 批量删除错误记录
   */
  batchDeleteErrors: (errorIds: string[]): Promise<void> => {
    return request.delete('/errors/batch', { data: { errorIds } });
  },
};
