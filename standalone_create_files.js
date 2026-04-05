#!/usr/bin/env node
/**
 * 独立的文件创建脚本
 */

const fs = require('fs');
const path = require('path');

console.log('Starting file creation...\n');

const baseDir = 'C:\\Users\\Ni0daunn\\Desktop\\work\\EzMonitor\\app\\monitor-app';
const typesDir = path.join(baseDir, 'src', 'types');
const apiDir = path.join(baseDir, 'src', 'api');

// Create directories
try {
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  console.log('✓ Created directory: ' + typesDir);
} catch (err) {
  console.error('✗ Error creating types directory:', err.message);
  process.exit(1);
}

try {
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  console.log('✓ Created directory: ' + apiDir);
} catch (err) {
  console.error('✗ Error creating api directory:', err.message);
  process.exit(1);
}

// API types content
const apiTypesContent = `/**
 * API 响应通用结构
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页响应数据
 */
export interface PaginationResponse<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * API 错误响应
 */
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}
`;

// Client content
const clientContent = `import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, ApiError } from '../types/api';

/**
 * 创建 Axios 实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可以在这里添加 token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }

    // 请求日志（开发环境）
    if (import.meta.env.DEV) {
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 响应日志（开发环境）
    if (import.meta.env.DEV) {
      console.log('📥 API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    // 统一处理业务错误码
    const { code, message, data } = response.data;
    if (code !== 0 && code !== 200) {
      const error: ApiError = {
        code,
        message: message || '请求失败',
        details: data,
      };
      console.error('❌ Business Error:', error);
      // 可以在这里添加全局错误提示
      return Promise.reject(error);
    }

    return response;
  },
  (error) => {
    // 处理 HTTP 错误
    let errorMessage = '网络请求失败';
    let errorCode = -1;

    if (error.response) {
      // 服务器返回错误状态码
      const { status, data } = error.response;
      errorCode = status;

      switch (status) {
        case 401:
          errorMessage = '未授权，请重新登录';
          // 可以在这里跳转到登录页
          break;
        case 403:
          errorMessage = '拒绝访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器错误';
          break;
        case 502:
          errorMessage = '网关错误';
          break;
        case 503:
          errorMessage = '服务不可用';
          break;
        default:
          errorMessage = data?.message || \`请求失败 (\${status})\`;
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMessage = '服务器无响应，请检查网络连接';
    } else {
      // 请求配置出错
      errorMessage = error.message || '请求配置错误';
    }

    const apiError: ApiError = {
      code: errorCode,
      message: errorMessage,
      details: error.response?.data,
    };

    console.error('❌ HTTP Error:', apiError);
    // 可以在这里添加全局错误提示（如 message.error）
    return Promise.reject(apiError);
  }
);

/**
 * 封装的请求方法
 */
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return apiClient.get<ApiResponse<T>>(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.post<ApiResponse<T>>(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.put<ApiResponse<T>>(url, data, config);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return apiClient.delete<ApiResponse<T>>(url, config);
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.patch<ApiResponse<T>>(url, data, config);
  },
};

export default apiClient;
`;

// Index content
const indexContent = `/**
 * API 统一导出
 */
export { default as apiClient, request } from './client';
export type { ApiResponse, ApiError, PaginationParams, PaginationResponse } from '../types/api';
`;

// Write files
const files = [
  { path: path.join(typesDir, 'api.ts'), content: apiTypesContent },
  { path: path.join(apiDir, 'client.ts'), content: clientContent },
  { path: path.join(apiDir, 'index.ts'), content: indexContent }
];

let successCount = 0;
files.forEach(file => {
  try {
    fs.writeFileSync(file.path, file.content, 'utf-8');
    console.log('✓ Created: ' + file.path);
    successCount++;
  } catch (err) {
    console.error('✗ Error creating ' + file.path + ':', err.message);
  }
});

console.log('\n' + (successCount === files.length ? '✅ All files created successfully!' : '❌ Some files failed to create'));
process.exit(successCount === files.length ? 0 : 1);
