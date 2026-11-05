'use client';
import { Banknote, Bike, CheckCircle2, ChevronRight, Clock, MapPin, Navigation, Package, Power, RefreshCw, Store } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { DELIVERY_STATUS, VEHICLES, type LatLng } from '@/lib/geo';
import type { Job, ShipperMe } from '@/lib/shipper';
import { useLiveLocation } from '@/lib/use-live-location';

function JobCard({ j, children }: { j: Job; children?: React.ReactNode }) {
  const st = DELIVERY_STATUS[j.status];
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xl font-extrabold text-brand-700">+{money(j.fee)}</div>
          <div className="text-xs text-slate-500">Đơn {j.order.code} · {j.itemCount} món{j.distanceKm != null ? ` · quãng đường ${j.distanceKm} km` : ''}</div>
        </div>
        {j.status === 'WAITING'
          ? j.toPickupKm != null && <span className="badge bg-sky-50 text-sky-700"><Navigation className="h-3 w-3" />Cách bạn {j.toPickupKm} km · ~{j.etaPickupMin}′</span>
          : <span className={`badge ${st?.cls}`}>{st?.label}</span>}
      </div>
      <div className="relative space-y-3 pl-6 text-sm">
        <span className="absolute top-2 bottom-2 left-[9px] w-0.5 bg-slate-200" />
        <div className="relative"><span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"><Store className="h-3 w-3" /></span><div className="font-semibold text-ink">{j.store.name}</div><div className="text-slate-500">{j.pickupAddress}</div></div>
        <div className="relative"><span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white"><MapPin className="h-3 w-3" /></span><div className="font-semibold text-ink">{j.order.customerName}</div><div className="text-slate-500">{j.dropoffAddress}</div></div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {j.codAmount > 0 ? <span className="badge bg-amber-100 text-amber-800"><Banknote className="h-3 w-3" />Thu hộ {money(j.codAmount)}</span> : <span className="badge bg-green-100 text-green-800">Đã thanh toán – không thu tiền</span>}
        {j.order.deliverySlot && <span className="badge bg-slate-100 text-slate-600"><Clock className="h-3 w-3" />{j.order.deliverySlot}</span>}
      </div>
      {children}
    </div>
  );
}

export default function ShipperHome() {
  const toast = useToast();
  const [me, setMe] = useState<ShipperMe | null>(null);
  const [tab, setTab] = useState<'jobs' | 'active' | 'history'>('jobs');
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [active, setActive] = useState<Job[] | null>(null);
  const [history, setHistory] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState(0);
  const pos = useRef<LatLng | null>(null);

  const loadMe = useCallback(() => api<ShipperMe>('/shipper/me').then(setMe), []);
  const loadJobs = useCallback(() => {
    const q = pos.current ? `?lat=${pos.current.lat}&lng=${pos.current.lng}` : '';
    return api<Job[]>('/shipper/jobs' + q).then(setJobs).catch(() => setJobs([]));
  }, []);
  const loadActive = useCallback(() => api<{ items: Job[] }>('/shipper/deliveries?status=active').then((r) => setActive(r.items)), []);
  const loadHistory = useCallback(() => api<{ items: Job[] }>('/shipper/deliveries?status=history&limit=30').then((r) => setHistory(r.items)), []);
  const refresh = useCallback(() => { loadMe(); loadJobs(); loadActive(); }, [loadMe, loadJobs, loadActive]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);
  // Tự làm mới danh sách đơn mỗi 20 giây khi đang trực tuyến (như app tài xế)
  useEffect(() => {
    if (!me?.profile.isOnline) return;
    const t = setInterval(() => { loadJobs(); loadActive(); }, 20000);
    return () => clearInterval(t);
  }, [me?.profile.isOnline, loadJobs, loadActive]);
  useLiveLocation(!!me?.profile.isOnline, (p) => { pos.current = p; });

  const toggleOnline = async () => {
    const next = !me?.profile.isOnline;
    let loc: Partial<LatLng> = {};
    if (next) {
      try { const { currentPosition } = await import('@/lib/geo'); loc = await currentPosition(); pos.current = loc as LatLng; }
      catch (e: any) { toast(`${e.message} – vẫn bật nhận đơn nhưng không sắp xếp theo khoảng cách`, 'error'); }
    }
    await api('/shipper/me', { method: 'PATCH', json: { isOnline: next, ...loc } });
    toast(next ? 'Đã bật nhận đơn' : 'Đã tắt nhận đơn');
    refresh();
  };

  const accept = async (j: Job) => {
    setBusy(j.id);
    try { await api(`/shipper/jobs/${j.id}/accept`, { method: 'POST' }); toast(`Đã nhận đơn ${j.order.code}`); setTab('active'); refresh(); }
    catch (e: any) { toast(e.message, 'error'); loadJobs(); }
    finally { setBusy(0); }
  };

  if (!me) return <Spinner />;
  const online = me.profile.isOnline;
  return (
    <div className="space-y-3">
      <div className={`overflow-hidden rounded-2xl text-white shadow-lift ${online ? 'bg-gradient-to-br from-brand-600 to-emerald-500' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Bike className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{me.fullName}</div>
            <div className="text-xs text-white/80">{VEHICLES[me.profile.vehicleType] ?? me.profile.vehicleType}{me.profile.plateNumber ? ` · ${me.profile.plateNumber}` : ''}</div>
          </div>
          <button onClick={toggleOnline} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow ${online ? 'bg-white text-brand-700' : 'bg-brand-500 text-white'}`} data-testid="toggle-online">
            <Power className="h-4 w-4" />{online ? 'Đang nhận đơn' : 'Bật nhận đơn'}
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 text-center">
          <div className="p-3"><div className="text-lg font-extrabold">{money(me.stats.todayEarnings)}</div><div className="text-[11px] text-white/80">Thu nhập hôm nay</div></div>
          <div className="p-3"><div className="text-lg font-extrabold">{me.stats.todayTrips}</div><div className="text-[11px] text-white/80">Chuyến hôm nay</div></div>
          <div className="p-3"><div className="text-lg font-extrabold">{money(me.stats.todayCod)}</div><div className="text-[11px] text-white/80">Tiền thu hộ (COD)</div></div>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-soft">
        {([['jobs', `Đơn mới${jobs?.length ? ` (${jobs.length})` : ''}`], ['active', `Đang giao${active?.length ? ` (${active.length})` : ''}`], ['history', 'Lịch sử']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>{l}</button>
        ))}
        <button onClick={refresh} className="rounded-lg px-3 text-slate-500 hover:bg-slate-100" aria-label="Làm mới"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {tab === 'jobs' && (!online ? (
        <div className="card text-center text-sm text-slate-500"><Power className="mx-auto mb-2 h-8 w-8 text-slate-300" />Bật <b>nhận đơn</b> để xem các đơn đang chờ giao gần bạn.</div>
      ) : !jobs ? <Spinner /> : !jobs.length ? (
        <div className="card"><Empty icon={<Package className="h-7 w-7" />} text="Chưa có đơn nào đang chờ – danh sách tự làm mới mỗi 20 giây" /></div>
      ) : jobs.map((j) => (
        <JobCard key={j.id} j={j}>
          <button className="btn-primary btn-lg w-full" disabled={busy === j.id} onClick={() => accept(j)} data-testid={`accept-${j.id}`}>{busy === j.id ? 'Đang nhận…' : `Nhận đơn · +${money(j.fee)}`}</button>
        </JobCard>
      )))}

      {tab === 'active' && (!active ? <Spinner /> : !active.length ? (
        <div className="card"><Empty icon={<Bike className="h-7 w-7" />} text="Bạn chưa nhận đơn nào" /></div>
      ) : active.map((j) => (
        <JobCard key={j.id} j={j}>
          <Link href={`/shipper/${j.id}`} className="btn-primary w-full">{j.status === 'ASSIGNED' ? 'Đến cửa hàng lấy hàng' : 'Giao cho khách'} <ChevronRight className="h-4 w-4" /></Link>
        </JobCard>
      )))}

      {tab === 'history' && (!history ? <Spinner /> : !history.length ? <div className="card"><Empty text="Chưa có chuyến nào" /></div> : (
        <div className="card divide-y divide-slate-100 p-0">
          {history.map((j) => (
            <Link key={j.id} href={`/shipper/${j.id}`} className="flex items-center gap-3 px-4 py-3">
              {j.status === 'DELIVERED' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <Package className="h-5 w-5 shrink-0 text-slate-400" />}
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{j.order.code} · {j.store.name}</div><div className="text-xs text-slate-500">{dateTime(j.deliveredAt ?? j.createdAt)} · {DELIVERY_STATUS[j.status]?.label}</div></div>
              <span className={`text-sm font-bold ${j.status === 'DELIVERED' ? 'text-brand-700' : 'text-slate-400'}`}>{j.status === 'DELIVERED' ? `+${money(j.fee)}` : '—'}</span>
            </Link>
          ))}
        </div>
      ))}
      <p className="pt-2 text-center text-xs text-slate-400">Tổng: {me.stats.totalTrips} chuyến · {money(me.stats.totalEarnings)}</p>
    </div>
  );
}
