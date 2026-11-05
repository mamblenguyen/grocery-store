'use client';
import 'leaflet/dist/leaflet.css';
import type { Map as LMap, Marker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { DEFAULT_CENTER, type LatLng } from '@/lib/geo';

export interface MapPoint extends LatLng { kind: 'store' | 'home' | 'shipper' | 'pin'; label?: string }

const ICON: Record<MapPoint['kind'], { emoji: string; bg: string }> = {
  store: { emoji: '🏪', bg: '#0a9c4b' },
  home: { emoji: '🏠', bg: '#e11d48' },
  shipper: { emoji: '🛵', bg: '#2563eb' },
  pin: { emoji: '📍', bg: '#e11d48' },
};

/**
 * Bản đồ OpenStreetMap (Leaflet).
 * - points: các điểm cần hiển thị (cửa hàng, khách, tài xế…) – tự căn khung
 * - onPick: cho phép chạm/bấm lên bản đồ để ghim vị trí
 */
export function MapView({ points, onPick, height = 280, className = '' }: { points: MapPoint[]; onPick?: (p: LatLng) => void; height?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<Marker[]>([]);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const key = JSON.stringify(points.map((p) => [p.kind, p.lat, p.lng]));

  useEffect(() => {
    let alive = true;
    import('leaflet').then((L) => {
      if (!alive || !box.current) return;
      if (!map.current) {
        map.current = L.map(box.current, { zoomControl: true, attributionControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
        map.current.on('click', (e) => pickRef.current?.({ lat: Math.round(e.latlng.lat * 1e6) / 1e6, lng: Math.round(e.latlng.lng * 1e6) / 1e6 }));
      }
      const m = map.current;
      layer.current.forEach((x) => x.remove());
      layer.current = points.map((p) => {
        const ic = ICON[p.kind];
        const icon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-6px)"><div style="width:36px;height:36px;border-radius:999px;background:${ic.bg};display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:0 4px 10px rgba(0,0,0,.25);border:3px solid #fff">${ic.emoji}</div></div>`,
          iconSize: [36, 42], iconAnchor: [18, 40],
        });
        const mk = L.marker([p.lat, p.lng], { icon }).addTo(m);
        if (p.label) mk.bindTooltip(p.label, { direction: 'top', offset: [0, -36] });
        return mk;
      });
      if (points.length === 1) m.setView([points[0].lat, points[0].lng], Math.max(m.getZoom(), 15));
      else if (points.length > 1) m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
      setTimeout(() => m.invalidateSize(), 100);
    });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  return <div ref={box} style={{ height }} className={`z-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${onPick ? 'cursor-crosshair' : ''} ${className}`} />;
}
