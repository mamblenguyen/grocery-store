import { Platform } from 'react-native';
import { secure } from './storage';

/** Mặc định: web/iOS dùng localhost, máy ảo Android dùng 10.0.2.2 (= localhost của máy tính) */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api');
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000';
const ASSET_BASE = API_URL.replace(/\/api\/?$/, '');
export const TOKEN_KEY = 'grocery_token';

let memToken: string | null | undefined;
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };
export const tokenStore = {
  get: async () => (memToken !== undefined ? memToken : (memToken = await secure.get(TOKEN_KEY))),
  set: async (t: string) => { memToken = t; await secure.set(TOKEN_KEY, t); },
  clear: async () => { memToken = null; await secure.del(TOKEN_KEY); },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T = any>(path: string, opts: { method?: string; json?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined });
  } catch {
    throw new ApiError(`Không kết nối được máy chủ (${API_URL}). Kiểm tra mạng / địa chỉ API.`, 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || 'Có lỗi xảy ra';
    if (res.status === 401 && token) { await tokenStore.clear(); onUnauthorized?.(); }
    if (res.status === 429) throw new ApiError('Thao tác quá nhanh, vui lòng thử lại sau ít phút', 429);
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export function qs(params: Record<string, unknown>) {
  const s = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  return s ? `?${s}` : '';
}

export function imageUrl(src?: string | null) {
  if (!src) return 'https://placehold.co/600x600/png?text=No+Image';
  return src.startsWith('/uploads') ? `${ASSET_BASE}${src}` : src;
}
