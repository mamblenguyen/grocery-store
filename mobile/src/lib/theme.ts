import { Platform } from 'react-native';

export const C = {
  brand50: '#effdf4', brand100: '#d9fbe6', brand200: '#b4f4cd', brand500: '#16be5e', brand600: '#0a9c4b', brand700: '#0c7a3e', brand800: '#0f6035',
  accent: '#f97316', accent50: '#fff7ed',
  ink: '#0f172a', text: '#334155', muted: '#64748b', faint: '#94a3b8',
  line: '#e2e8f0', line2: '#f1f5f9', bg: '#f8fafc', white: '#ffffff',
  red: '#ef4444', red50: '#fef2f2', amber: '#f59e0b', amber50: '#fffbeb', sky: '#0284c7', sky50: '#f0f9ff', violet: '#7c3aed', violet50: '#f5f3ff',
};

export const R = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)' } as object,
  default: { shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
});

export const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  PENDING: { label: 'Chờ xác nhận', fg: '#92400e', bg: '#fef3c7' },
  CONFIRMED: { label: 'Đã xác nhận', fg: '#075985', bg: '#e0f2fe' },
  SHIPPING: { label: 'Đang giao', fg: '#3730a3', bg: '#e0e7ff' },
  COMPLETED: { label: 'Hoàn thành', fg: '#065f46', bg: '#d1fae5' },
  CANCELLED: { label: 'Đã huỷ', fg: '#334155', bg: '#e2e8f0' },
};
export const PAY_STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  UNPAID: { label: 'Chưa thanh toán', fg: '#9a3412', bg: '#ffedd5' },
  PAID: { label: 'Đã thanh toán', fg: '#065f46', bg: '#d1fae5' },
  REFUNDED: { label: 'Đã hoàn tiền', fg: '#334155', bg: '#e2e8f0' },
};
