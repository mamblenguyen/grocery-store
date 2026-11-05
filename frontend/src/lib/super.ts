import type { Plan, StoreStatus } from './types';

export const STORE_STATUS: Record<StoreStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Đang hoạt động', cls: 'bg-green-100 text-green-800' },
  SUSPENDED: { label: 'Tạm ngưng', cls: 'bg-amber-100 text-amber-800' },
  CLOSED: { label: 'Đã đóng', cls: 'bg-slate-200 text-slate-700' },
};

export const BUSINESS_TYPES: Record<string, string> = { HKD: 'Hộ kinh doanh', CONG_TY: 'Công ty / doanh nghiệp', CA_NHAN: 'Cá nhân' };

/** Thông tin đối tác – chỉ super admin xem */
export interface PartnerInfo {
  businessName?: string | null; businessType?: string | null; taxCode?: string | null; businessAddress?: string | null;
  representative?: string | null; representativeId?: string | null; representativePhone?: string | null;
  bankName?: string | null; bankAccountNo?: string | null; bankAccountName?: string | null;
  contractNo?: string | null; contractSignedAt?: string | null;
}
export const EMPTY_PARTNER: Required<{ [K in keyof PartnerInfo]: string }> = {
  businessName: '', businessType: 'HKD', taxCode: '', businessAddress: '', representative: '', representativeId: '', representativePhone: '',
  bankName: '', bankAccountNo: '', bankAccountName: '', contractNo: '', contractSignedAt: '',
};

export interface SuperStore extends PartnerInfo {
  id: number; slug: string; name: string; phone?: string | null; email?: string | null; address?: string | null; logo?: string | null;
  status: StoreStatus; planId: number | null; planExpiresAt: string | null; note?: string | null; createdAt: string;
  plan: Pick<Plan, 'id' | 'code' | 'name' | 'priceMonthly' | 'maxProducts' | 'maxStaff'> | null;
  _count: { products: number; orders: number; members: number };
  owner?: { id: number; email: string; fullName: string } | null;
}

export interface StorePaymentRow {
  id: number; storeId: number; months: number; amount: number; periodFrom: string; periodTo: string; method?: string | null;
  note?: string | null; createdAt: string; plan?: { name: string } | null; createdBy?: { fullName: string } | null;
  store?: { id: number; name: string; slug: string };
}

export const METHODS = ['Chuyển khoản', 'Tiền mặt', 'Ví điện tử', 'Miễn phí / khuyến mãi'];

export function daysLeft(d: string | null) {
  return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
}

/** Nhãn hạn dùng: màu theo mức độ */
export function expiryInfo(d: string | null) {
  const n = daysLeft(d);
  if (n == null) return { text: 'Không thời hạn', cls: 'text-slate-500' };
  if (n <= 0) return { text: `Hết hạn ${new Date(d!).toLocaleDateString('vi-VN')}`, cls: 'text-red-600 font-semibold' };
  if (n <= 7) return { text: `Còn ${n} ngày`, cls: 'text-amber-600 font-semibold' };
  return { text: new Date(d!).toLocaleDateString('vi-VN'), cls: 'text-slate-600' };
}

export function slugifyVi(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
