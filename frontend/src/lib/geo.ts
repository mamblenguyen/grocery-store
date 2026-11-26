export interface LatLng { lat: number; lng: number }

/** Trung tâm mặc định khi chưa có vị trí (TP.HCM) */
export const DEFAULT_CENTER: LatLng = { lat: 10.7769, lng: 106.7009 };

export function distanceKm(a?: { lat?: number | null; lng?: number | null } | null, b?: { lat?: number | null; lng?: number | null } | null) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

/** Mở Google Maps chỉ đường (điện thoại sẽ mở app Google Maps) */
export function directionsUrl(to: { lat?: number | null; lng?: number | null; address?: string | null }) {
  const dest = to.lat != null && to.lng != null ? `${to.lat},${to.lng}` : encodeURIComponent(to.address ?? '');
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=two-wheeler`;
}

/** Lấy vị trí hiện tại của thiết bị */
export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(new Error('Thiết bị không hỗ trợ định vị'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6 }),
      (e) => reject(new Error(e.code === 1 ? 'Bạn chưa cho phép truy cập vị trí' : 'Không lấy được vị trí, thử lại ngoài trời')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

export const VEHICLES: Record<string, string> = { XE_MAY: 'Xe máy', XE_DAP: 'Xe đạp', O_TO: 'Ô tô' };

export const DELIVERY_STATUS: Record<string, { label: string; cls: string }> = {
  WAITING: { label: 'Đang tìm tài xế', cls: 'bg-amber-100 text-amber-800' },
  ASSIGNED: { label: 'Tài xế đang đến lấy hàng', cls: 'bg-sky-100 text-sky-800' },
  PICKED_UP: { label: 'Đang giao hàng', cls: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Đã giao', cls: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Giao không thành công', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Đã huỷ chuyến', cls: 'bg-slate-200 text-slate-700' },
};
