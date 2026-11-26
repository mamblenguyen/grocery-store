/** Khoảng cách đường chim bay (km) giữa 2 toạ độ – công thức haversine */
export function distanceKm(a?: { lat?: number | null; lng?: number | null } | null, b?: { lat?: number | null; lng?: number | null } | null): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

/** Ước tính thời gian di chuyển bằng xe máy trong phố (~20 km/h) – phút */
export const etaMinutes = (km: number | null) => (km == null ? null : Math.max(3, Math.round((km / 20) * 60)));
