export const money = (n?: number | null) => `${(n ?? 0).toLocaleString('vi-VN')}₫`;
export const num = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN');
const pad = (n: number) => String(n).padStart(2, '0');
export const dateTime = (d: string | Date) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())} ${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; };
export const date = (d: string | Date) => { const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; };
/** Ngày kiểu @db.Date (UTC 00:00) */
export const dateOnly = (d?: string | null) => { if (!d) return ''; const x = new Date(d); return `${pad(x.getUTCDate())}/${pad(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`; };
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const PAYMENT_METHOD: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng', BANK_TRANSFER: 'Chuyển khoản VietQR', VNPAY: 'VNPay (ATM / Visa / QR)', CASH: 'Tiền mặt',
};
export const EXPORT_REASONS: Record<string, string> = {
  DAMAGED: 'Hàng hư hỏng', EXPIRED: 'Hàng hết hạn', RETURN_SUPPLIER: 'Trả nhà cung cấp', INTERNAL: 'Sử dụng nội bộ', OTHER: 'Khác',
};
export const DOC_TYPE: Record<string, string> = { IMPORT: 'Phiếu nhập kho', EXPORT: 'Phiếu xuất kho', STOCKTAKE: 'Phiếu kiểm kê' };
export const DOC_STATUS: Record<string, string> = { DRAFT: 'Nháp', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã huỷ' };

export function vietQrUrl(bank: { bankBin: string; accountNo: string; accountName: string }, amount: number, info: string) {
  return `https://img.vietqr.io/image/${bank.bankBin}-${bank.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(bank.accountName)}`;
}
