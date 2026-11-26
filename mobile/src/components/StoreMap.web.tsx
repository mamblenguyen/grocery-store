import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { imageUrl } from '@/lib/api';
import { C, R } from '@/lib/theme';
import type { PublicStore } from '@/lib/types';

type Point = { lat: number; lng: number };
type Props = { stores: PublicStore[]; userLocation?: Point | null; onPick: (store: PublicStore) => void };

export function StoreMap({ stores, userLocation, onPick }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(() => {
    if (!host.current) return;
    const pinned = stores.filter((s) => s.lat != null && s.lng != null);
    const first = userLocation ?? (pinned[0] ? { lat: pinned[0].lat!, lng: pinned[0].lng! } : { lat: 10.7769, lng: 106.7009 });
    const map = L.map(host.current, { zoomControl: true }).setView([first.lat, first.lng], userLocation ? 13 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const icon = L.divIcon({ className: '', html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#16803c;border:3px solid white;box-shadow:0 2px 7px #0005;transform:rotate(-45deg)"><div style="width:8px;height:8px;border-radius:50%;background:white;margin:7px"></div></div>', iconSize: [32, 38], iconAnchor: [16, 36] });
    pinned.forEach((s) => {
      const photo = s.banner || s.logo;
      const popup = document.createElement('button');
      popup.style.cssText = 'display:flex;width:280px;border:0;background:white;text-align:left;padding:0;cursor:pointer;font-family:inherit';
      popup.innerHTML = `${photo ? `<img src="${imageUrl(photo)}" style="width:88px;height:88px;object-fit:cover;border-radius:10px" />` : '<div style="width:88px;height:88px;background:#ecfdf3;border-radius:10px;display:grid;place-items:center;font-size:28px">🏪</div>'}<span style="padding-left:10px;flex:1"><b style="display:block;font-size:15px;color:#17202a">${escapeHtml(s.name)}</b><small style="display:block;color:#667085;line-height:16px;margin-top:4px">${escapeHtml(s.address || 'Chưa cập nhật địa chỉ')}</small>${s.distanceKm != null ? `<small style="display:block;color:#16803c;font-weight:700;margin-top:4px">${s.distanceKm.toFixed(1)} km${s.etaMin ? ` · khoảng ${s.etaMin} phút` : ''}</small>` : ''}<strong style="display:block;color:#16803c;font-size:12px;margin-top:6px">Mở cửa hàng ›</strong></span>`;
      popup.onclick = () => pickRef.current(s);
      L.marker([s.lat!, s.lng!], { icon }).addTo(map).bindPopup(popup, { minWidth: 280, closeButton: true });
    });
    if (userLocation) L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindTooltip('Vị trí của tôi');
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); };
  }, [stores, userLocation]);
  return <View style={styles.wrap}>{!stores.some((s) => s.lat != null && s.lng != null) && <Text style={styles.notice}>Chưa có cửa hàng nào được ghim trên bản đồ</Text>}<div ref={host} style={{ width: '100%', height: '100%' }} /></View>;
}

const escapeHtml = (s: string) => s.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]!));
const styles = StyleSheet.create({ wrap: { height: 460, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.line2, borderWidth: 1, borderColor: C.line }, notice: { position: 'absolute', zIndex: 1000, top: 18, alignSelf: 'center', backgroundColor: '#fff', padding: 10, borderRadius: R.full, color: C.muted } });
