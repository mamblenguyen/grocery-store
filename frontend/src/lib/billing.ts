export type LimitKind = 'products' | 'staff' | 'ordersMonthly' | 'campaignsMonthly';
export const LIMIT_KINDS: LimitKind[] = ['products', 'ordersMonthly', 'staff', 'campaignsMonthly'];
export const LIMIT_LABEL: Record<LimitKind, string> = {
  products: 'Sản phẩm', staff: 'Nhân viên', ordersMonthly: 'Đơn hàng/tháng', campaignsMonthly: 'Chiến dịch/tháng',
};
export const LIMIT_UNIT: Record<LimitKind, string> = {
  products: 'sản phẩm', staff: 'nhân viên', ordersMonthly: 'đơn/tháng', campaignsMonthly: 'chiến dịch/tháng',
};

export interface AddonPack {
  id: number; code: string; name: string; description?: string | null; kind: LimitKind; quantity: number; price: number; months: number;
  isActive: boolean; sortOrder: number; _count?: { purchases: number };
}
export interface AddonChoice { packId: number; units: number }
export interface AddonLine { packId: number; code: string; name: string; kind: string; quantity: number; units: number; unitPrice: number; price: number; months: number }
export interface LimitInfo { base: number | null; extra: number; max: number | null }
export type Limits = Record<LimitKind, LimitInfo>;
export type Usage = Record<LimitKind, number>;

export type PurchaseStatus = 'PENDING' | 'ACTIVE' | 'CANCELLED';
export interface StorePurchase {
  id: number; code: string; storeId: number; type: 'ADDON' | 'PLAN'; status: PurchaseStatus; name: string;
  packId?: number | null; kind?: LimitKind | null; units: number; quantity: number; planId?: number | null; months: number; amount: number;
  startsAt?: string | null; expiresAt?: string | null; paymentMethod?: string | null; paymentRef?: string | null; paidAt?: string | null;
  note?: string | null; source: 'SELF' | 'SUPER' | 'CONTRACT'; createdAt: string;
  store?: { id: number; name: string; slug: string }; plan?: { id: number; name: string } | null; pack?: { id: number; name: string; code: string } | null;
}
export const PURCHASE_STATUS: Record<PurchaseStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-800' },
  ACTIVE: { label: 'Đã kích hoạt', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-slate-200 text-slate-600' },
};
export const PURCHASE_SOURCE: Record<string, string> = { SELF: 'Cửa hàng tự mua', SUPER: 'Sàn cấp', CONTRACT: 'Kèm hợp đồng' };

export const packDuration = (months: number) => (months > 0 ? `${months} tháng` : 'không thời hạn');
/** Còn hiệu lực? */
export const isLive = (p: Pick<StorePurchase, 'status' | 'expiresAt'>) => p.status === 'ACTIVE' && (!p.expiresAt || new Date(p.expiresAt) > new Date());
