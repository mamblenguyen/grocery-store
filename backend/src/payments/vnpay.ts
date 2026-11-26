import { createHmac } from 'crypto';

/**
 * Tiện ích VNPay (API v2.1.0) – https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Chuỗi ký = các tham số sắp xếp theo key, key & value encode kiểu application/x-www-form-urlencoded (khoảng trắng → "+")
 */
const enc = (v: string) => encodeURIComponent(v).replace(/%20/g, '+');

export function vnpSignData(params: Record<string, string>) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${enc(k)}=${enc(String(params[k]))}`)
    .join('&');
}

export function vnpSign(params: Record<string, string>, secret: string) {
  return createHmac('sha512', secret).update(Buffer.from(vnpSignData(params), 'utf-8')).digest('hex');
}

/** yyyyMMddHHmmss theo giờ Việt Nam (GMT+7) */
export function vnpDate(d: Date) {
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}`;
}

export function vnpBuildUrl(baseUrl: string, params: Record<string, string>, secret: string) {
  return `${baseUrl}?${vnpSignData(params)}&vnp_SecureHash=${vnpSign(params, secret)}`;
}

/** Kiểm tra chữ ký của query VNPay gửi về (return URL / IPN) */
export function vnpVerify(query: Record<string, string>, secret: string) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;
  if (!vnp_SecureHash) return false;
  return vnpSign(rest, secret).toLowerCase() === String(vnp_SecureHash).toLowerCase();
}

export const VNP_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công, giao dịch bị nghi ngờ',
  '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking',
  '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  '11': 'Đã hết hạn chờ thanh toán',
  '12': 'Thẻ/Tài khoản bị khoá',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Khách hàng huỷ giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi không xác định',
};
