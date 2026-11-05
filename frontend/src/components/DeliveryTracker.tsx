'use client';
import { Bike, Phone, RefreshCw, Search, XCircle } from 'lucide-react';
import { MapView, type MapPoint } from '@/components/map/MapView';
import { dateTime, money } from '@/lib/format';
import { DELIVERY_STATUS, distanceKm, VEHICLES } from '@/lib/geo';
import type { Delivery } from '@/lib/types';

const STEPS: [Delivery['status'][], string][] = [
  [['WAITING'], 'Tìm tài xế'],
  [['ASSIGNED'], 'Tài xế đến lấy hàng'],
  [['PICKED_UP'], 'Đang giao'],
  [['DELIVERED'], 'Đã giao'],
];

/** Theo dõi chuyến giao: trạng thái, tài xế, bản đồ vị trí trực tiếp */
export function DeliveryTracker({ d, onRequest, onCancel, onRefresh, staff = false }: {
  d: Delivery; staff?: boolean; onRequest?: () => void; onCancel?: () => void; onRefresh?: () => void;
}) {
  const st = DELIVERY_STATUS[d.status];
  const idx = STEPS.findIndex(([s]) => s.includes(d.status));
  const live = d.status === 'ASSIGNED' || d.status === 'PICKED_UP';
  const points: MapPoint[] = [];
  if (d.pickupLat != null && d.pickupLng != null) points.push({ kind: 'store', lat: d.pickupLat, lng: d.pickupLng, label: 'Cửa hàng' });
  if (d.dropoffLat != null && d.dropoffLng != null) points.push({ kind: 'home', lat: d.dropoffLat, lng: d.dropoffLng, label: 'Địa chỉ giao' });
  if (live && d.shipperLat != null && d.shipperLng != null) points.push({ kind: 'shipper', lat: d.shipperLat, lng: d.shipperLng, label: d.shipper?.fullName ?? 'Tài xế' });
  const remain = live ? distanceKm({ lat: d.shipperLat, lng: d.shipperLng }, d.status === 'ASSIGNED' ? { lat: d.pickupLat, lng: d.pickupLng } : { lat: d.dropoffLat, lng: d.dropoffLng }) : null;

  return (
    <div className="card space-y-4" data-testid="delivery-tracker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold"><Bike className="h-5 w-5 text-brand-600" /> Giao hàng</h3>
        <div className="flex items-center gap-2">
          <span className={`badge ${st.cls}`}>{st.label}</span>
          {onRefresh && live && <button onClick={onRefresh} className="btn-ghost btn-sm" aria-label="Làm mới"><RefreshCw className="h-4 w-4" /></button>}
        </div>
      </div>
      {!['FAILED', 'CANCELLED'].includes(d.status) && (
        <div className="grid grid-cols-4 gap-1.5">
          {STEPS.map(([, l], i) => (
            <div key={l} className="space-y-1">
              <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-brand-600' : 'bg-slate-200'} ${i === idx && d.status !== 'DELIVERED' ? 'animate-pulse' : ''}`} />
              <div className={`text-[11px] leading-tight ${i <= idx ? 'font-semibold text-brand-700' : 'text-slate-400'}`}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {d.status === 'WAITING' && <p className="flex items-center gap-2 text-sm text-slate-600"><Search className="h-4 w-4 animate-pulse text-amber-500" />Đang tìm tài xế gần cửa hàng…</p>}
      {d.shipper && live && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sky-50 p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-lg font-bold text-white">{d.shipper.fullName.trim().split(' ').pop()?.[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink">{d.shipper.fullName}</div>
            <div className="text-xs text-slate-500">{VEHICLES[d.shipper.shipperProfile?.vehicleType ?? ''] ?? 'Xe máy'}{d.shipper.shipperProfile?.plateNumber ? ` · ${d.shipper.shipperProfile.plateNumber}` : ''}{remain != null ? ` · còn ~${remain} km` : ''}</div>
          </div>
          {d.shipper.phone && <a href={`tel:${d.shipper.phone}`} className="btn-primary btn-sm"><Phone className="h-4 w-4" /> Gọi tài xế</a>}
        </div>
      )}
      {points.length > 0 && (live || staff) && <MapView points={points} height={240} />}
      {d.status === 'FAILED' && <p className="text-sm text-red-600">Giao không thành công: {d.failReason}</p>}
      {d.status === 'CANCELLED' && d.failReason && <p className="text-sm text-slate-500">{d.failReason}</p>}
      {d.status === 'DELIVERED' && d.deliveredAt && <p className="text-sm text-green-700">Đã giao lúc {dateTime(d.deliveredAt)}{d.shipper ? ` bởi ${d.shipper.fullName}` : ''}</p>}
      {staff && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">Phí tài xế {money(d.fee)} · thu hộ {money(d.codAmount)}{d.distanceKm != null ? ` · ${d.distanceKm} km` : ''}</span>
          <div className="flex gap-2">
            {onRequest && ['FAILED', 'CANCELLED'].includes(d.status) && <button className="btn-primary btn-sm" onClick={onRequest}><Bike className="h-4 w-4" /> Gọi tài xế lại</button>}
            {onCancel && ['WAITING', 'ASSIGNED'].includes(d.status) && <button className="btn-outline btn-sm text-red-600" onClick={onCancel}><XCircle className="h-4 w-4" /> Huỷ gọi tài xế</button>}
          </div>
        </div>
      )}
    </div>
  );
}
