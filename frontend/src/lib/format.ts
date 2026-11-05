export const money = (n?: number | null) => `${(n ?? 0).toLocaleString('vi-VN')}₫`;
export const dateTime = (d: string | Date) => new Date(d).toLocaleString('vi-VN');
export const date = (d: string | Date) => new Date(d).toLocaleDateString('vi-VN');

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-800' },
  SHIPPING: { label: 'Đang giao', cls: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-gray-200 text-gray-700' },
};

export const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: 'Chưa thanh toán', cls: 'bg-orange-100 text-orange-800' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-green-100 text-green-800' },
  REFUNDED: { label: 'Đã hoàn tiền', cls: 'bg-gray-200 text-gray-700' },
};

export const PAYMENT_METHOD: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
};

export const ROLES: Record<string, string> = { ADMIN: 'Quản trị', STAFF: 'Nhân viên', CUSTOMER: 'Khách hàng' };
