'use client';
import { ArrowLeft, Banknote, CheckCircle2, MapPin, Navigation, Phone, Store, Undo2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MapView, type MapPoint } from '@/components/map/MapView';
import { useToast } from '@/components/Toast';
import { Modal, Spinner } from '@/components/ui';
import { api, imageUrl } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { DELIVERY_STATUS, directionsUrl, type LatLng } from '@/lib/geo';
import type { Job } from '@/lib/shipper';
import { useLiveLocation } from '@/lib/use-live-location';

const STEPS = ['ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<Job | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');
  const load = useCallback(() => api<Job>(`/shipper/deliveries/${id}`).then(setD).catch((e) => toast(e.message, 'error')), [id, toast]);
  useEffect(() => { load(); }, [load]);
  const live = !!d && ['ASSIGNED', 'PICKED_UP'].includes(d.status);
  useLiveLocation(live, setMe);

  const act = async (path: string, msg: string, body?: unknown) => {
    setBusy(true);
    try { setD(await api<Job>(`/shipper/deliveries/${id}/${path}`, { method: 'POST', json: body })); toast(msg); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const release = async () => {
    if (!confirm('Trả đơn này cho tài xế khác?')) return;
    try { await api(`/shipper/deliveries/${id}/release`, { method: 'POST' }); toast('Đã trả đơn'); router.push('/shipper'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  if (!d) return <Spinner />;
  const toStore = d.status === 'ASSIGNED';
  const target = toStore ? { lat: d.pickupLat, lng: d.pickupLng, address: d.pickupAddress } : { lat: d.dropoffLat, lng: d.dropoffLng, address: d.dropoffAddress };
  const points: MapPoint[] = [];
  if (d.pickupLat != null && d.pickupLng != null) points.push({ kind: 'store', lat: d.pickupLat, lng: d.pickupLng, label: d.store.name });
  if (d.dropoffLat != null && d.dropoffLng != null) points.push({ kind: 'home', lat: d.dropoffLat, lng: d.dropoffLng, label: d.order.customerName });
  const meAt = me ?? (d.shipperLat != null && d.shipperLng != null ? { lat: d.shipperLat, lng: d.shipperLng } : null);
  if (meAt && live) points.push({ kind: 'shipper', ...meAt, label: 'Bạn' });
  const stepIdx = STEPS.indexOf(d.status);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link href="/shipper" className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" /> Danh sách</Link>
        <span className={`badge ml-auto ${DELIVERY_STATUS[d.status]?.cls}`}>{DELIVERY_STATUS[d.status]?.label}</span>
      </div>

      {points.length > 0 ? <MapView points={points} height={260} /> : <div className="card text-center text-sm text-slate-500">Chưa có toạ độ – dùng nút chỉ đường theo địa chỉ.</div>}

      {live && (
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${i <= stepIdx ? 'bg-brand-600 text-white' : 'bg-white text-slate-400'}`}>
              {['Đến lấy hàng', 'Đang giao', 'Hoàn thành'][i]}
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-4">
        <div className={`rounded-xl p-3 ${toStore && live ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><Store className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-brand-700 uppercase">Lấy hàng</div><div className="font-bold">{d.store.name}</div><div className="text-sm text-slate-600">{d.pickupAddress}</div></div>
          </div>
          {live && (
            <div className="mt-3 flex gap-2">
              <a href={directionsUrl({ lat: d.pickupLat, lng: d.pickupLng, address: d.pickupAddress })} target="_blank" className="btn-outline btn-sm flex-1"><Navigation className="h-4 w-4" /> Chỉ đường</a>
              {d.store.phone && <a href={`tel:${d.store.phone}`} className="btn-outline btn-sm flex-1"><Phone className="h-4 w-4" /> Gọi cửa hàng</a>}
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${!toStore && live ? 'bg-rose-50 ring-1 ring-rose-200' : ''}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white"><MapPin className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-rose-700 uppercase">Giao đến</div><div className="font-bold">{d.order.customerName} · {d.order.phone}</div>
              <div className="text-sm text-slate-600">{d.dropoffAddress}</div>
              {d.order.note && <div className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">Ghi chú: {d.order.note}</div>}
              {d.order.deliverySlot && <div className="mt-1 text-xs text-slate-500">Khung giờ: {d.order.deliverySlot}</div>}
            </div>
          </div>
          {live && (
            <div className="mt-3 flex gap-2">
              <a href={directionsUrl({ lat: d.dropoffLat, lng: d.dropoffLng, address: d.dropoffAddress })} target="_blank" className="btn-outline btn-sm flex-1"><Navigation className="h-4 w-4" /> Chỉ đường</a>
              <a href={`tel:${d.order.phone}`} className="btn-outline btn-sm flex-1"><Phone className="h-4 w-4" /> Gọi khách</a>
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between"><h3 className="font-bold">Đơn {d.order.code}</h3><span className="text-sm text-slate-500">{d.itemCount} món</span></div>
        {d.order.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(i.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><div className="truncate font-medium">{i.productName}</div><div className="text-xs text-slate-400">{i.variantName}</div></div>
            <b>×{i.quantity}</b>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {d.codAmount > 0
            ? <span className="flex items-center gap-2 font-bold text-amber-700"><Banknote className="h-5 w-5" />Thu của khách: {money(d.codAmount)}</span>
            : <span className="font-semibold text-green-700">Khách đã thanh toán – không thu tiền</span>}
          <span className="text-sm text-slate-500">Bạn nhận <b className="text-brand-700">{money(d.fee)}</b></span>
        </div>
      </div>

      {d.status === 'ASSIGNED' && (
        <div className="space-y-2">
          <button className="btn-primary btn-lg w-full" disabled={busy} onClick={() => act('pickup', 'Đã lấy hàng – bắt đầu giao')} data-testid="pickup"><CheckCircle2 className="h-5 w-5" /> Đã lấy hàng tại cửa hàng</button>
          <button className="btn-ghost w-full text-slate-500" onClick={release}><Undo2 className="h-4 w-4" /> Trả đơn (chưa lấy hàng)</button>
        </div>
      )}
      {d.status === 'PICKED_UP' && (
        <div className="space-y-2">
          <button className="btn-primary btn-lg w-full" disabled={busy} onClick={() => confirm(d.codAmount ? `Xác nhận đã giao và đã thu ${money(d.codAmount)}?` : 'Xác nhận đã giao cho khách?') && act('complete', 'Giao thành công 🎉')} data-testid="complete">
            <CheckCircle2 className="h-5 w-5" /> {d.codAmount ? `Đã giao & thu ${money(d.codAmount)}` : 'Đã giao thành công'}
          </button>
          <button className="btn-outline w-full text-red-600" onClick={() => setFailing(true)}><XCircle className="h-4 w-4" /> Giao không thành công</button>
        </div>
      )}
      {d.status === 'DELIVERED' && <div className="card text-center text-green-700"><CheckCircle2 className="mx-auto h-8 w-8" />Đã giao lúc {dateTime(d.deliveredAt!)}</div>}
      {d.status === 'FAILED' && <div className="card text-center text-red-600">Giao không thành công: {d.failReason}. Vui lòng mang hàng trả lại cửa hàng.</div>}

      <Modal open={failing} onClose={() => setFailing(false)} title="Giao không thành công">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {['Khách không nghe máy', 'Sai địa chỉ', 'Khách từ chối nhận', 'Khách hẹn giao lại'].map((r) => <button key={r} className={`chip ${reason === r ? 'chip-active' : ''}`} onClick={() => setReason(r)}>{r}</button>)}
          </div>
          <textarea className="input" rows={2} placeholder="Lý do khác…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setFailing(false)}>Đóng</button><button className="btn-danger" disabled={reason.trim().length < 3} onClick={async () => { await act('fail', 'Đã báo giao không thành công', { reason }); setFailing(false); }}>Xác nhận</button></div>
        </div>
      </Modal>
    </div>
  );
}
