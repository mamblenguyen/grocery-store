'use client';
import { BadgeCheck, CalendarClock, Package, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { ROOT_DOMAIN, storeUrl } from '@/lib/platform';
import { date, money } from '@/lib/format';
import type { Plan } from '@/lib/types';

interface Sub {
  store: { id: number; slug: string; name: string; status: string; planExpiresAt: string | null; createdAt: string; daysLeft: number | null; plan: Plan | null };
  usage: { products: number; staff: number };
  payments: { id: number; months: number; amount: number; periodFrom: string; periodTo: string; method?: string | null; note?: string | null; createdAt: string; plan?: { name: string } | null }[];
  plans: Plan[];
}

function Meter({ icon, label, used, max }: { icon: React.ReactNode; label: string; used: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{used.toLocaleString('vi-VN')}<span className="text-base font-medium text-slate-400"> / {max == null ? 'không giới hạn' : max.toLocaleString('vi-VN')}</span></div>
      {max != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}

export default function SubscriptionPage() {
  const [d, setD] = useState<Sub | null>(null);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');
  useEffect(() => { api<Sub>('/admin/subscription').then(setD).catch((e) => setErr(e.message)); }, []);
  const link = d ? (ROOT_DOMAIN ? storeUrl(d.store.slug) : `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${d.store.slug}`) : '';
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 1, width: 360 }).then(setQr); }, [link]);
  if (err) return <div className="card text-center text-slate-500">{err}</div>;
  if (!d) return <Spinner />;
  const { store: s } = d;
  const expired = s.daysLeft != null && s.daysLeft <= 0;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Gói dịch vụ</h1>
      <div className={`card flex flex-wrap items-center gap-4 ${expired ? 'border-red-200 bg-red-50' : ''}`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><BadgeCheck className="h-7 w-7" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-slate-500">Gói đang dùng</div>
          <div className="text-xl font-bold text-ink">{s.plan?.name ?? 'Chưa gán gói'}{s.plan && <span className="ml-2 text-base font-medium text-slate-500">{s.plan.priceMonthly ? `${money(s.plan.priceMonthly)}/tháng` : 'Miễn phí'}</span>}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> Hạn sử dụng</div>
          <div className={`text-lg font-bold ${expired ? 'text-red-600' : s.daysLeft != null && s.daysLeft <= 7 ? 'text-amber-600' : 'text-ink'}`}>
            {s.planExpiresAt ? `${date(s.planExpiresAt)} · ${expired ? 'đã hết hạn' : `còn ${s.daysLeft} ngày`}` : 'Không thời hạn'}
          </div>
        </div>
      </div>
      <div className="card flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="QR cửa hàng" className="h-36 w-36 rounded-xl border border-slate-200" />}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-bold">Mã QR cửa hàng</h2>
          <p className="text-sm text-slate-500">In và dán tại quầy: khách quét bằng camera điện thoại hoặc trong app để mở đúng cửa hàng của bạn.</p>
          <a href={link} target="_blank" className="link block truncate text-sm">{link}</a>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(link)}>Sao chép link</button>
            {qr && <a className="btn-primary btn-sm" href={qr} download={`qr-${s.slug}.png`}>Tải ảnh QR</a>}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Meter icon={<Package className="h-4 w-4" />} label="Sản phẩm" used={d.usage.products} max={s.plan?.maxProducts ?? null} />
        <Meter icon={<Users className="h-4 w-4" />} label="Nhân viên (không tính chủ)" used={d.usage.staff} max={s.plan?.maxStaff ?? null} />
      </div>
      <div className="card">
        <h2 className="mb-3 font-bold">Các gói của nền tảng</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {d.plans.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.id === s.plan?.id ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between"><b>{p.name}</b>{p.id === s.plan?.id && <span className="badge bg-brand-600 text-white">Đang dùng</span>}</div>
              <div className="mt-1 text-lg font-bold">{p.priceMonthly ? `${money(p.priceMonthly)}/tháng` : 'Miễn phí'}</div>
              <div className="mt-1 text-sm text-slate-500">{p.maxProducts ? `${p.maxProducts} sản phẩm` : 'Không giới hạn SP'} · {p.maxStaff == null ? 'không giới hạn NV' : `${p.maxStaff} nhân viên`}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">Để gia hạn hoặc đổi gói, vui lòng liên hệ quản trị nền tảng. Khi hết hạn, cửa hàng chỉ xem được dữ liệu và tạm ngưng nhận đơn online.</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-bold">Lịch sử thanh toán phí dịch vụ</h2>
        <table className="table">
          <thead><tr><th>Ngày</th><th>Gói</th><th>Số tháng</th><th>Thời hạn</th><th className="text-right">Số tiền</th><th>Hình thức</th></tr></thead>
          <tbody>
            {d.payments.length ? d.payments.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{date(p.createdAt)}</td><td>{p.plan?.name ?? '—'}</td><td>{p.months}</td>
                <td className="text-xs">{date(p.periodFrom)} → {date(p.periodTo)}</td><td className="text-right font-semibold">{money(p.amount)}</td><td>{p.method || '—'}</td>
              </tr>
            )) : <tr><td colSpan={6} className="text-center text-slate-400">Chưa có thanh toán</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
