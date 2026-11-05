export const money = (n?: number | null) => `${(n ?? 0).toLocaleString('vi-VN')}₫`;
export const num = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN');
export const dateTime = (d: string | Date) => new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
export const date = (d: string | Date) => new Date(d).toLocaleDateString('vi-VN');
/** Ngày dạng @db.Date (UTC 00:00) → hiển thị đúng ngày */
export const dateOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '');

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-sky-100 text-sky-800' },
  SHIPPING: { label: 'Đang giao', cls: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-slate-200 text-slate-700' },
};

export const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: 'Chưa thanh toán', cls: 'bg-orange-100 text-orange-800' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-emerald-100 text-emerald-800' },
  REFUNDED: { label: 'Đã hoàn tiền', cls: 'bg-slate-200 text-slate-700' },
};

export const PAYMENT_METHOD: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng (VietQR)',
  VNPAY: 'Thẻ ATM / Visa / QR qua VNPay',
  CASH: 'Tiền mặt',
};

export const ROLES: Record<string, string> = { SUPER_ADMIN: 'Quản trị nền tảng', ADMIN: 'Chủ cửa hàng', STAFF: 'Nhân viên', CUSTOMER: 'Khách hàng' };

export const STOCK_DOC_TYPE: Record<string, { label: string; short: string; cls: string }> = {
  IMPORT: { label: 'Phiếu nhập kho', short: 'Nhập', cls: 'bg-emerald-100 text-emerald-800' },
  EXPORT: { label: 'Phiếu xuất kho', short: 'Xuất', cls: 'bg-orange-100 text-orange-800' },
  STOCKTAKE: { label: 'Phiếu kiểm kê', short: 'Kiểm kê', cls: 'bg-sky-100 text-sky-800' },
};
export const STOCK_DOC_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-slate-200 text-slate-700' },
  COMPLETED: { label: 'Hoàn tất', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-red-100 text-red-700' },
};
export const EXPORT_REASONS: Record<string, string> = {
  DAMAGED: 'Hàng hư hỏng', EXPIRED: 'Hàng hết hạn', RETURN_SUPPLIER: 'Trả nhà cung cấp', INTERNAL: 'Sử dụng nội bộ', OTHER: 'Khác',
};
export const INVENTORY_REASONS: Record<string, string> = {
  IMPORT: 'Nhập kho', EXPORT: 'Xuất kho', STOCKTAKE: 'Kiểm kê', ORDER: 'Bán hàng', CANCEL: 'Huỷ đơn', ADJUST: 'Điều chỉnh',
};

/** Ảnh QR chuyển khoản VietQR (chuẩn Napas) – tự điền số tiền & nội dung */
export function vietQrUrl(bank: { bankBin: string; accountNo: string; accountName: string }, amount: number, info: string, template = 'compact2') {
  const q = new URLSearchParams({ amount: String(amount), addInfo: info, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${bank.bankBin}-${bank.accountNo}-${template}.png?${q}`;
}
