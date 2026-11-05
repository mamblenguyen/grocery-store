export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || 'Chợ Tạp Hoá';
export const PLATFORM_SLOGAN = process.env.NEXT_PUBLIC_PLATFORM_SLOGAN || 'Sàn đi chợ online của các tạp hoá quanh bạn';

/**
 * Tên miền gốc của sàn để bật subdomain cho từng đối tác, VD "tensan.vn" → tap-hoa-xanh.tensan.vn.
 * Thử ở máy: "lvh.me:3000" (mọi *.lvh.me trỏ về 127.0.0.1). Để trống = chỉ dùng đường dẫn /s/<slug>.
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Đường dẫn hệ thống: trên subdomain sẽ chuyển về tên miền gốc */
export const PLATFORM_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/account', '/orders', '/payment', '/admin', '/super', '/print', '/stores'];

const proto = () => (typeof window !== 'undefined' ? window.location.protocol : ROOT_DOMAIN.includes('lvh.me') || ROOT_DOMAIN.includes('localhost') ? 'http:' : 'https:');

/** Link "thương hiệu" của cửa hàng: subdomain nếu đã cấu hình, ngược lại /s/<slug> */
export function storeUrl(slug: string, path = '/') {
  if (!ROOT_DOMAIN) return `/s/${slug}${path === '/' ? '' : path}`;
  return `${proto()}//${slug}.${ROOT_DOMAIN}${path === '/' ? '' : path}`;
}

/** Link tới trang của sàn (dùng khi đang ở subdomain cửa hàng) */
export function platformUrl(path = '/') {
  return ROOT_DOMAIN ? `${proto()}//${ROOT_DOMAIN}${path}` : path;
}

/** Tên miền cho cookie đăng nhập dùng chung giữa sàn và mọi subdomain (bỏ cổng) */
export const cookieDomain = () => (ROOT_DOMAIN ? ROOT_DOMAIN.split(':')[0] : '');

/** URL tuyệt đối có thuộc sàn không (chống chuyển hướng ra trang lạ sau đăng nhập) */
export function isOwnUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase();
    return !!ROOT_DOMAIN && (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`));
  } catch { return false; }
}
