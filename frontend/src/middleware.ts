import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_PATHS, ROOT_DOMAIN } from './lib/platform';

/**
 * Subdomain cho từng đối tác: tap-hoa-xanh.<ROOT_DOMAIN>/products → /s/tap-hoa-xanh/products
 * Trang hệ thống (đăng nhập, tài khoản, quản trị…) trên subdomain → chuyển về tên miền gốc.
 */
export function middleware(req: NextRequest) {
  if (!ROOT_DOMAIN) return NextResponse.next();
  const host = (req.headers.get('host') || '').toLowerCase();
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return NextResponse.next();
  const sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!sub || sub === 'www' || sub.includes('.')) return NextResponse.next();

  const url = req.nextUrl.clone();
  const path = url.pathname;
  if (path.startsWith('/s/')) {
    // /s/<slug>/x trên subdomain → bỏ tiền tố cho gọn
    const rest = path.split('/').slice(3).join('/');
    return NextResponse.redirect(new URL(`/${rest}${url.search}`, req.url));
  }
  if (PLATFORM_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    const target = new URL(`${req.nextUrl.protocol}//${ROOT_DOMAIN}${path}${url.search}`);
    // ?next=/checkout → quay lại đúng trang trên subdomain sau khi đăng nhập
    const next = target.searchParams.get('next');
    if (next?.startsWith('/')) target.searchParams.set('next', `${req.nextUrl.protocol}//${host}${next}`);
    return NextResponse.redirect(target);
  }
  url.pathname = `/s/${sub}${path === '/' ? '' : path}`;
  const headers = new Headers(req.headers);
  headers.set('x-store-subdomain', sub);
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest)$).*)'],
};
