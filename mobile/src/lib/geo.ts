import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export interface LatLng { lat: number; lng: number }

export function distanceKm(a?: { lat?: number | null; lng?: number | null } | null, b?: { lat?: number | null; lng?: number | null } | null) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

/** Lấy vị trí hiện tại (xin quyền nếu cần) */
export async function currentPosition(): Promise<LatLng> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Bạn chưa cho phép truy cập vị trí');
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6 };
}

/** Mở ứng dụng bản đồ để chỉ đường (Google Maps / Apple Maps) */
export function openDirections(to: { lat?: number | null; lng?: number | null; address?: string | null }) {
  const dest = to.lat != null && to.lng != null ? `${to.lat},${to.lng}` : encodeURIComponent(to.address ?? '');
  const url = Platform.OS === 'ios' && to.lat != null ? `maps://?daddr=${dest}` : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=two-wheeler`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`));
}

/** Mở bản đồ tại 1 điểm (VD: vị trí tài xế) */
export const openMapAt = (p: LatLng) => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`);

export const VEHICLES: Record<string, string> = { XE_MAY: 'Xe máy', XE_DAP: 'Xe đạp', O_TO: 'Ô tô' };

export const DELIVERY_STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  WAITING: { label: 'Đang tìm tài xế', fg: '#92400e', bg: '#fef3c7' },
  ASSIGNED: { label: 'Tài xế đang đến lấy hàng', fg: '#075985', bg: '#e0f2fe' },
  PICKED_UP: { label: 'Đang giao hàng', fg: '#3730a3', bg: '#e0e7ff' },
  DELIVERED: { label: 'Đã giao', fg: '#065f46', bg: '#d1fae5' },
  FAILED: { label: 'Giao không thành công', fg: '#b91c1c', bg: '#fee2e2' },
  CANCELLED: { label: 'Đã huỷ chuyến', fg: '#334155', bg: '#e2e8f0' },
};
