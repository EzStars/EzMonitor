/**
 * API 模块统一导出
 * 统一管理所有 API 接口，便于使用和维护
 */

// 导出请求工具
export { request, apiClient } from './request';

// 导出类型定义
export type * from './types';

// 导入各模块 API
import { errorApi } from './modules/error';
import { performanceApi } from './modules/performance';
import { behaviorApi } from './modules/behavior';
import { exceptionApi } from './modules/exception';
import { projectApi } from './modules/project';
import { sourceMapApi } from './modules/sourcemap';

// 导出各模块 API
export { errorApi } from './modules/error';
export { performanceApi } from './modules/performance';
export { behaviorApi } from './modules/behavior';
export { exceptionApi } from './modules/exception';
export { projectApi } from './modules/project';
export { sourceMapApi } from './modules/sourcemap';

// 导出各模块类型
export type { ErrorDataType } from './modules/error';
export type { PerformanceDataType } from './modules/performance';
export type { BehaviorDataType } from './modules/behavior';
export type { ExceptionDataType } from './modules/exception';

// 统一的 API 对象，便于组织和使用
export const api = {
  error: errorApi,
  performance: performanceApi,
  behavior: behaviorApi,
  exception: exceptionApi,
  project: projectApi,
  sourceMap: sourceMapApi,
};

// 默认导出
export default api;
