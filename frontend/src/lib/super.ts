import type { Plan, StoreStatus } from './types';
import { type AddressParts, EMPTY_ADDRESS } from './vn-address';

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
  /** Địa chỉ đăng ký kinh doanh theo Tỉnh/Huyện/Xã (businessAddress = chuỗi ghép) */
  businessAddressParts?: AddressParts | null;
}
type PartnerText = Exclude<keyof PartnerInfo, 'businessAddress' | 'businessAddressParts'>;
export type PartnerFormValue = Record<PartnerText, string> & { businessAddressParts: AddressParts };
export const EMPTY_PARTNER: PartnerFormValue = {
  businessName: '', businessType: 'HKD', taxCode: '', representative: '', representativeId: '', representativePhone: '',
  bankName: '', bankAccountNo: '', bankAccountName: '', contractNo: '', contractSignedAt: '', businessAddressParts: EMPTY_ADDRESS,
};

export interface SuperStore extends PartnerInfo {
  id: number; slug: string; name: string; phone?: string | null; email?: string | null; address?: string | null; logo?: string | null;
  /** Địa chỉ cửa hàng theo đơn vị hành chính */
  street?: string | null; provinceCode?: number | null; provinceName?: string | null; districtCode?: number | null; districtName?: string | null;
  wardCode?: number | null; wardName?: string | null;
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
