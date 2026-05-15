import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(body.error || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; imageUrl: string | null }[];
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  stock: number;
  imageUrl: string;
  quantity: number | null;
  unit: string | null;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string }>('/auth/me'),
};

export const categories = {
  getAll: (params: { page?: number; limit?: number; search?: string; parentId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page)                  qs.set('page',     String(params.page));
    if (params.limit)                 qs.set('limit',    String(params.limit));
    if (params.search)                qs.set('search',   params.search);
    if (params.parentId !== undefined) qs.set('parentId', params.parentId);
    const q = qs.toString() ? `?${qs}` : '';
    return request<PaginatedResponse<Category>>(`/categories${q}`);
  },
  getById: (id: string) => request<Category>(`/categories/${id}`),
  create:  (form: FormData) => request<Category>('/categories', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Category>(`/categories/${id}`, { method: 'PUT', body: form }),
  delete:  (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

export const products = {
  getAll: (params: { page?: number; limit?: number; search?: string; categoryId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page)       qs.set('page',       String(params.page));
    if (params.limit)      qs.set('limit',       String(params.limit));
    if (params.search)     qs.set('search',      params.search);
    if (params.categoryId) qs.set('categoryId',  params.categoryId);
    const q = qs.toString() ? `?${qs}` : '';
    return request<PaginatedResponse<Product>>(`/products${q}`);
  },
  getById: (id: string) => request<Product>(`/products/${id}`),
  create:  (form: FormData) => request<Product>('/products', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Product>(`/products/${id}`, { method: 'PUT', body: form }),
  delete:  (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};

export interface StoreScheduleDay {
  dayOfWeek: number;
  isOpen: boolean;
  openHour: number;
  closeHour: number;
}

export interface StoreConfig {
  id: string;
  status: 'open' | 'busy' | 'closed';
  busyTime: number | null;
  whatsappNumber: string | null;
  cbu: string | null;
  alias: string | null;
  titular: string | null;
  updatedAt: string;
  schedule: StoreScheduleDay[];
}

export const config = {
  get: () => request<StoreConfig>('/config'),
  updateStatus: (status: string, busyTime?: number | null) =>
    request<StoreConfig>('/config/status', {
      method: 'PUT',
      body: JSON.stringify({ status, busyTime }),
    }),
  updateSchedule: (schedule: StoreScheduleDay[]) =>
    request<StoreScheduleDay[]>('/config/schedule', {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    }),
  updateContact: (data: { whatsappNumber: string; cbu: string; alias: string; titular: string }) =>
    request<StoreConfig>('/config/contact', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const banners = {
  getAll: () => request<Banner[]>('/banners?all=true'),
  getById: (id: string) => request<Banner>(`/banners/${id}`),
  create:  (form: FormData) => request<Banner>('/banners', { method: 'POST', body: form }),
  update:  (id: string, form: FormData) => request<Banner>(`/banners/${id}`, { method: 'PUT', body: form }),
  delete:  (id: string) => request<void>(`/banners/${id}`, { method: 'DELETE' }),
};
