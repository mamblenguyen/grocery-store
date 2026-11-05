'use client';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/context/settings';
import { Logo } from './Header';

const FbIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" /></svg>;
const YtIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" /></svg>;
const TkIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z" /></svg>;

export function Footer() {
  const { settings: s } = useSettings();
  const socials = [
    { url: s.social.facebook, icon: <FbIcon />, label: 'Facebook' },
    { url: s.social.youtube, icon: <YtIcon />, label: 'YouTube' },
    { url: s.social.tiktok, icon: <TkIcon />, label: 'TikTok' },
    { url: s.social.zalo, icon: <span className="text-[10px] font-extrabold">Zalo</span>, label: 'Zalo' },
  ].filter((x) => x.url);

  return (
    <footer className="mt-16 bg-ink text-slate-300">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-slate-400">Siêu thị tạp hoá trực tuyến – hàng tươi mỗi ngày, giá minh bạch, giao nhanh tận nhà.</p>
          {socials.length > 0 && (
            <div className="flex gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.url} target="_blank" rel="noreferrer" aria-label={x.label} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-brand-600">{x.icon}</a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Liên hệ</h4>
          <ul className="space-y-3 text-sm">
            {s.address && <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{s.address}</li>}
            {s.hotline && <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`tel:${s.hotline}`} className="hover:text-white">{s.hotline}</a></li>}
            {s.email && <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a></li>}
            {s.openingHours && <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{s.openingHours}</li>}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Hỗ trợ khách hàng</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/orders" className="hover:text-white">Tra cứu đơn hàng</Link></li>
            <li><Link href="/account" className="hover:text-white">Tài khoản của tôi</Link></li>
            <li><Link href="/account/wishlist" className="hover:text-white">Sản phẩm yêu thích</Link></li>
            <li><span>Chính sách đổi trả 7 ngày</span></li>
            <li><span>Giao hàng: {s.freeShippingThreshold ? `miễn phí từ ${s.freeShippingThreshold.toLocaleString('vi-VN')}₫` : 'toàn khu vực'}</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold text-white">Thanh toán an toàn</h4>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {s.payment.cod && <span className="rounded-lg bg-white/10 px-3 py-2">COD</span>}
            {s.payment.bankTransfer && <span className="rounded-lg bg-white/10 px-3 py-2">VietQR</span>}
            {s.payment.vnpay && <span className="rounded-lg bg-white/10 px-3 py-2">VNPay</span>}
            <span className="rounded-lg bg-white/10 px-3 py-2">Visa / Master</span>
          </div>
          {s.taxCode && <p className="mt-5 text-xs text-slate-500">MST: {s.taxCode}</p>}
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {s.storeName}. Bảo lưu mọi quyền.</div>
    </footer>
  );
}
