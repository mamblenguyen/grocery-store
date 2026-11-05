'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

export const FALLBACK_SETTINGS: StoreSettings = {
  storeName: 'Tạp Hoá Xanh', slogan: 'Đi chợ online – Tươi ngon mỗi ngày', logo: '', hotline: '', email: '', address: '',
  openingHours: '', announcement: '', taxCode: '', vatRate: 0, invoiceFooter: '',
  shippingFee: 20000, freeShippingThreshold: 300000, minOrderValue: 0, deliverySlots: [], deliveryDaysAhead: 3,
  payment: { cod: true, bankTransfer: false, vnpay: false },
  bank: { bankBin: '', bankName: '', accountNo: '', accountName: '' },
  banners: [], social: { facebook: '', zalo: '', tiktok: '', youtube: '' },
};

const Ctx = createContext<{ settings: StoreSettings; loaded: boolean; reload: () => void }>({
  settings: FALLBACK_SETTINGS, loaded: false, reload: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const reload = () => api<StoreSettings>('/settings').then((s) => { setSettings(s); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { reload(); }, []);
  return <Ctx.Provider value={{ settings, loaded, reload }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
