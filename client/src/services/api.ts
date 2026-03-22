import axios from 'axios';
import type { PaginatedResponse, Item, SearchParams, ErrorResponse } from '@shared/types';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截 — 附加 JWT
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截 — 统一错误处理 + 401 跳转登录
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // Token 过期或无效 → 清除登录态，跳转登录页
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    const data = err.response?.data as ErrorResponse | undefined;
    const message = data?.error?.message || '网络异常，请稍后重试';
    return Promise.reject(new Error(message));
  },
);

/** 搜索物品 */
export async function searchItems(params: SearchParams): Promise<PaginatedResponse<Item>> {
  const { data } = await http.get('/items', { params });
  return data;
}

/** 获取物品详情 */
export async function getItem(id: string): Promise<Item> {
  const { data } = await http.get(`/items/${id}`);
  return data;
}

export default http;
