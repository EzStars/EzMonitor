/**
 * API 配置和基础请求方法
 */

// API 基础地址
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * 通用请求方法
 */
export async function request<T = any>(
  url: string,
  options?: RequestInit,
): Promise<{
  code: number;
  message: string;
  data: T;
}> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

/**
 * GET 请求
 */
export async function get<T = any>(
  url: string,
  params?: Record<string, any>,
): Promise<{
  code: number;
  message: string;
  data: T;
}> {
  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return request<T>(`${url}${queryString}`, {
    method: 'GET',
  });
}

/**
 * POST 请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
): Promise<{
  code: number;
  message: string;
  data: T;
}> {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT 请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
): Promise<{
  code: number;
  message: string;
  data: T;
}> {
  return request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE 请求
 */
export async function del<T = any>(
  url: string,
  params?: Record<string, any>,
): Promise<{
  code: number;
  message: string;
  data: T;
}> {
  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return request<T>(`${url}${queryString}`, {
    method: 'DELETE',
  });
}
