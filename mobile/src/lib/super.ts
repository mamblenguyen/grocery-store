import type { Plan, StoreStatus, User } from './types';

export const STORE_STATUS: Record<StoreStatus, { label: string; fg: string; bg: string }> = {
  ACTIVE: { label: 'Hoạt động', fg: '#065f46', bg: '#d1fae5' },
  SUSPENDED: { label: 'Tạm ngưng', fg: '#92400e', bg: '#fef3c7' },
  CLOSED: { label: 'Đã đóng', fg: '#334155', bg: '#e2e8f0' },
};

export interface SuperStore {
  id: number; slug: string; name: string; phone?: string | null; email?: string | null; address?: string | null;
  status: StoreStatus; planId: number | null; planExpiresAt: string | null; note?: string | null; createdAt: string;
  plan: Pick<Plan, 'id' | 'code' | 'name' | 'priceMonthly' | 'maxProducts' | 'maxStaff'> | null;
  _count: { products: number; orders: number; members: number };
  owner?: { id: number; email: string; fullName: string } | null;
}

export type SuperStoreDetail = SuperStore & {
  members: User[];
  payments: { id: number; months: number; amount: number; periodFrom: string; periodTo: string; method?: string | null; createdAt: string; plan?: { name: string } | null }[];
  stats: { revenue: number; orders: number; monthRevenue: number; monthOrders: number; customers: number; variants: number };
};

export function expiryInfo(d: string | null) {
  if (!d) return { text: 'Không thời hạn', color: '#64748b', days: null as number | null };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { text: `Hết hạn ${new Date(d).toLocaleDateString('vi-VN')}`, color: '#ef4444', days };
  if (days <= 7) return { text: `Còn ${days} ngày`, color: '#f59e0b', days };
  return { text: `Đến ${new Date(d).toLocaleDateString('vi-VN')}`, color: '#64748b', days };
}

export const slugifyVi = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
