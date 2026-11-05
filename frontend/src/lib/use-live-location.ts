'use client';
import { useEffect, useRef } from 'react';
import { api } from './api';
import type { LatLng } from './geo';

/** Gửi vị trí GPS định kỳ khi đang bật nhận đơn (khách & cửa hàng thấy tài xế trên bản đồ) */
export function useLiveLocation(enabled: boolean, onPos?: (p: LatLng) => void) {
  const last = useRef(0);
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        onPos?.(pos);
        if (Date.now() - last.current < 15000) return;
        last.current = Date.now();
        api('/shipper/location', { method: 'POST', json: pos }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

