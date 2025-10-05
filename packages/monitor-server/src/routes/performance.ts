import Router from '@koa/router';
import {
  reportPerformance,
  getPerformanceList,
  getPerformanceByType,
  getPerformanceStats,
  getWebVitals,
  getSlowRequests,
  getErrorRequests,
  getResourceStats,
  clearPerformanceData,
  getStorageInfo,
} from '../controllers/performance';
import { connectSSE, getSSEStats } from '../controllers/sse';

const router = new Router({ prefix: '/api/performance' });

// ✅ SSE 连接端点
router.get('/stream', connectSSE);

// SSE 统计信息
router.get('/sse-stats', getSSEStats);

// 数据上报
router.post('/report', reportPerformance);

// 获取数据列表
router.get('/list', getPerformanceList);

// 获取指定类型的数据
router.get('/:appId/:subType', getPerformanceByType);

// 获取统计数据
router.get('/stats', getPerformanceStats);

// 获取核心 Web Vitals
router.get('/webvitals', getWebVitals);

// 获取慢请求
router.get('/slow-requests', getSlowRequests);

// 获取错误请求
router.get('/error-requests', getErrorRequests);

// 获取资源加载统计
router.get('/resource-stats', getResourceStats);

// 获取存储信息
router.get('/storage-info', getStorageInfo);

// 清空数据
router.post('/clear', clearPerformanceData);

export default router;
