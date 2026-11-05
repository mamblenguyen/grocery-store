import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { api } from './api';
import type { LatLng } from './geo';

/** Khi bật nhận đơn / đang giao: theo dõi GPS và gửi vị trí lên máy chủ (tối đa 1 lần / 15 giây) */
export function useLiveLocation(enabled: boolean, onPos?: (p: LatLng) => void) {
  const last = useRef(0);
  const cb = useRef(onPos);
  cb.current = onPos;
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 }, (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        cb.current?.(pos);
        if (Date.now() - last.current < 15000) return;
        last.current = Date.now();
        api('/shipper/location', { method: 'POST', json: pos }).catch(() => {});
      });
    })().catch(() => {});
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled]);
}
