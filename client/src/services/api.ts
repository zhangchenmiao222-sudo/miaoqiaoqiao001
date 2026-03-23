import axios from 'axios';
import type { PaginatedResponse, Item, SearchParams, ErrorResponse, Zone, DogSearchResult } from '@shared/types';

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

// 响应拦截 — 统一错误处理
http.interceptors.response.use(
  (res) => res,
  (err) => {
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

/** 更新物品位置 */
export async function updateItemLocation(
  id: string,
  payload: { zoneId: string; locationDetail: string },
): Promise<Item> {
  const { data } = await http.put(`/items/${id}`, payload);
  return data;
}

/** 获取所有区域 */
export async function getZones(): Promise<Zone[]> {
  const { data } = await http.get('/zones');
  return data;
}

/** 按区域或类别获取物品 */
export async function getItemsByFilter(params: Partial<SearchParams>): Promise<PaginatedResponse<Item>> {
  const { data } = await http.get('/items', { params });
  return data;
}

/** 上传物品位置照片 */
export async function uploadItemPhoto(id: string, file: File): Promise<{ imageUrl: string; item: Item }> {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await http.post(`/items/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** 按犬只编号查询，结果按类型分组 */
export async function searchByDogId(dogId: string): Promise<DogSearchResult> {
  const { data } = await http.get(`/items/dog/${encodeURIComponent(dogId)}`);
  return data;
}

export default http;
