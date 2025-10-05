import type { ApiResponse } from './types';

// 请求配置接口
interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  [key: string]: any;
}

// 请求响应接口
interface RequestResponse<T = any> {
  data: ApiResponse<T>;
  status: number;
  statusText: string;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || '/api';
    this.timeout = 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // 通用请求方法
  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<RequestResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    const token = localStorage.getItem('token');

    const headers = {
      ...this.defaultHeaders,
      ...config?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const requestConfig: RequestInit = {
      method: method.toUpperCase(),
      headers,
      ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {}),
    };

    // 添加时间戳防止 GET 请求缓存
    const finalUrl =
      method === 'GET' && config?.params
        ? `${fullUrl}?${new URLSearchParams({ ...config.params, _t: Date.now().toString() }).toString()}`
        : fullUrl;

    console.log('API Request:', method.toUpperCase(), finalUrl, data);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(finalUrl, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const responseData: ApiResponse<T> = await response.json();
      console.log('API Response:', finalUrl, responseData);

      if (responseData.code === 200 || responseData.success) {
        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
        };
      } else {
        throw new Error(responseData.message || '请求失败');
      }
    } catch (error) {
      console.error('Request Error:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时');
        }
        throw error;
      }
      throw new Error('网络错误');
    }
  }

  // 处理 HTTP 错误
  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage = '网络错误';

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || `请求失败 (${response.status})`;
    } catch {
      // 无法解析错误响应
    }

    switch (response.status) {
      case 401:
        errorMessage = '未授权，请重新登录';
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        errorMessage = '拒绝访问';
        break;
      case 404:
        errorMessage = '请求的资源不存在';
        break;
      case 500:
        errorMessage = '服务器内部错误';
        break;
    }

    throw new Error(errorMessage);
  }

  // GET 请求
  async get<T = any>(
    url: string,
    config?: RequestConfig & { params?: Record<string, any> },
  ): Promise<T> {
    const response = await this.request<T>('GET', url, undefined, config);
    return response.data.data;
  }

  // POST 请求
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const response = await this.request<T>('POST', url, data, config);
    return response.data.data;
  }

  // PUT 请求
  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const response = await this.request<T>('PUT', url, data, config);
    return response.data.data;
  }

  // DELETE 请求
  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.request<T>('DELETE', url, undefined, config);
    return response.data.data;
  }

  // PATCH 请求
  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> {
    const response = await this.request<T>('PATCH', url, data, config);
    return response.data.data;
  }
}

// 创建并导出 API 客户端实例
export const apiClient = new ApiClient();

// 导出请求方法的简化版本
export const request = {
  get: <T = any>(
    url: string,
    config?: RequestConfig & { params?: Record<string, any> },
  ): Promise<T> => apiClient.get<T>(url, config),

  post: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> => apiClient.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> =>
    apiClient.put<T>(url, data, config),

  delete: <T = any>(url: string, config?: RequestConfig): Promise<T> =>
    apiClient.delete<T>(url, config),

  patch: <T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<T> => apiClient.patch<T>(url, data, config),
};

export default apiClient;
