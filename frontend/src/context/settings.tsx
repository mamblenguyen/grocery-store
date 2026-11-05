'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';
import { PLATFORM_NAME, PLATFORM_SLOGAN } from '@/lib/platform';

export const FALLBACK_SETTINGS: StoreSettings = {
  storeName: PLATFORM_NAME, slogan: PLATFORM_SLOGAN, logo: '', hotline: '', email: '', address: '',
  openingHours: '', announcement: '', taxCode: '', vatRate: 0, invoiceFooter: '',
  shippingFee: 20000, freeShippingThreshold: 300000, minOrderValue: 0, deliverySlots: [], deliveryDaysAhead: 3,
  payment: { cod: true, bankTransfer: false, vnpay: false },
  bank: { bankBin: '', bankName: '', accountNo: '', accountName: '' },
  banners: [], social: { facebook: '', zalo: '', tiktok: '', youtube: '' },
};

interface SettingsCtx { settings: StoreSettings; loaded: boolean; error: string; reload: () => void }
const Ctx = createContext<SettingsCtx>({ settings: FALLBACK_SETTINGS, loaded: true, error: '', reload: () => {} });

/**
 * Cài đặt của một cửa hàng.
 * - store: slug → cài đặt công khai (/settings, header X-Store)
 * - admin: cài đặt của cửa hàng đang quản trị (/admin/settings)
 * - không truyền gì → thông tin chung của nền tảng
 */
export function SettingsProvider({ store, admin, children }: { store?: string | null; admin?: boolean; children: React.ReactNode }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [loaded, setLoaded] = useState(!store && !admin);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    if (!store && !admin) return;
    const req = admin ? api<StoreSettings>('/admin/settings') : api<StoreSettings>('/settings', { headers: { 'X-Store': store! } });
    req.then((s) => { setSettings(s); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoaded(true));
  }, [store, admin]);
  useEffect(() => { reload(); }, [reload]);
  return <Ctx.Provider value={{ settings, loaded, error, reload }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
