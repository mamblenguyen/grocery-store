'use client';
import { AlertTriangle, Banknote, ShoppingBag, Store, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner, StatCard } from '@/components/ui';
import { api } from '@/lib/api';
import { money, num } from '@/lib/format';
import { expiryInfo, STORE_STATUS, type SuperStore } from '@/lib/super';

interface Dash {
  stores: { ACTIVE: number; SUSPENDED: number; CLOSED: number; total: number; expired: number; expiringSoon: number };
  users: Record<string, number>;
  gmv: { total: number; orders: number; month: number; monthOrders: number };
  revenue: { total: number; month: number; mrr: number };
  expiringSoon: SuperStore[];
  recentStores: SuperStore[];
  topStores: { store?: { id: number; name: string; slug: string }; revenue: number; orders: number }[];
}

function StoreRow({ s }: { s: SuperStore }) {
  const e = expiryInfo(s.planExpiresAt);
  return (
    <Link href={`/super/stores/${s.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Store className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{s.name}</div><div className="truncate text-xs text-slate-400">/s/{s.slug} · {s.plan?.name ?? 'Chưa có gói'}</div></div>
      <span className={`text-xs ${e.cls}`}>{e.text}</span>
    </Link>
  );
}

export default function SuperDashboard() {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { api<Dash>('/super/dashboard').then(setD); }, []);
  if (!d) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="violet" icon={<Store className="h-5 w-5" />} label="Cửa hàng" value={num(d.stores.total)} hint={`${d.stores.ACTIVE} hoạt động · ${d.stores.SUSPENDED} tạm ngưng`} />
        <StatCard tone="brand" icon={<TrendingUp className="h-5 w-5" />} label="Doanh thu định kỳ (MRR)" value={money(d.revenue.mrr)} hint={`Thu tháng này ${money(d.revenue.month)}`} />
        <StatCard tone="sky" icon={<ShoppingBag className="h-5 w-5" />} label="GMV tháng này" value={money(d.gmv.month)} hint={`${num(d.gmv.monthOrders)} đơn · tổng ${money(d.gmv.total)}`} />
        <StatCard tone="accent" icon={<Users className="h-5 w-5" />} label="Người dùng" value={num(Object.values(d.users).reduce((a, b) => a + b, 0))} hint={`${num(d.users.CUSTOMER ?? 0)} khách · ${num((d.users.ADMIN ?? 0) + (d.users.STAFF ?? 0))} quản trị/NV`} />
      </div>
      {(d.stores.expired > 0 || d.stores.expiringSoon > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="flex-1"><b>{d.stores.expiringSoon}</b> cửa hàng sắp hết hạn trong 7 ngày, <b>{d.stores.expired}</b> cửa hàng đã hết hạn (chỉ xem, không bán online).</span>
          <Link href="/super/stores?expiry=expired" className="btn-outline btn-sm">Xem cửa hàng hết hạn</Link>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-3">
          <h2 className="px-3 pt-2 pb-2 font-bold">Sắp hết hạn (≤ 7 ngày)</h2>
          {d.expiringSoon.length ? d.expiringSoon.map((s) => <StoreRow key={s.id} s={s} />) : <p className="px-3 pb-3 text-sm text-slate-400">Không có cửa hàng nào</p>}
        </div>
        <div className="card p-3">
          <h2 className="px-3 pt-2 pb-2 font-bold">Doanh số tháng này</h2>
          {d.topStores.length ? d.topStores.map((t, i) => (
            <Link key={t.store?.id ?? i} href={`/super/stores/${t.store?.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.store?.name}</span>
              <span className="text-right text-sm"><b className="text-brand-700">{money(t.revenue)}</b><span className="block text-xs text-slate-400">{t.orders} đơn</span></span>
            </Link>
          )) : <p className="px-3 pb-3 text-sm text-slate-400">Chưa có đơn hàng</p>}
        </div>
        <div className="card p-3">
          <div className="flex items-center justify-between px-3 pt-2 pb-2"><h2 className="font-bold">Cửa hàng mới</h2><Link href="/super/stores" className="text-sm font-semibold text-violet-700">Tất cả</Link></div>
          {d.recentStores.map((s) => (
            <Link key={s.id} href={`/super/stores/${s.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{s.name}</span><span className="text-xs text-slate-400">{s._count.products} SP · {s._count.orders} đơn</span></span>
              <span className={`badge ${STORE_STATUS[s.status].cls}`}>{STORE_STATUS[s.status].label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="card flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Banknote className="h-5 w-5" /></span>
        <div className="flex-1"><div className="text-sm text-slate-500">Tổng phí dịch vụ đã thu</div><div className="text-xl font-bold">{money(d.revenue.total)}</div></div>
        <Link href="/super/payments" className="btn-outline">Xem phiếu thu</Link>
        <Link href="/super/stores?new=1" className="btn-primary">+ Thêm đối tác</Link>
      </div>
    </div>
  );
}
