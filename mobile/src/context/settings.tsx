import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';
import { useStore } from './store';

export const PLATFORM_NAME = process.env.EXPO_PUBLIC_PLATFORM_NAME || 'Chợ Tạp Hoá';

export const FALLBACK_SETTINGS: StoreSettings = {
  storeName: PLATFORM_NAME, slogan: 'Đi chợ online tại tạp hoá gần bạn', logo: '', hotline: '', email: '', address: '', openingHours: '',
  announcement: '', taxCode: '', vatRate: 0, invoiceFooter: '', shippingFee: 20000, freeShippingThreshold: 300000, minOrderValue: 0,
  deliverySlots: [], deliveryDaysAhead: 3, payment: { cod: true, bankTransfer: false, vnpay: false },
  bank: { bankBin: '', bankName: '', accountNo: '', accountName: '' }, banners: [], social: { facebook: '', zalo: '', tiktok: '', youtube: '' },
};
const Ctx = createContext<{ settings: StoreSettings; reload: () => void }>({ settings: FALLBACK_SETTINGS, reload: () => {} });

/** Cài đặt của cửa hàng đang chọn */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { store } = useStore();
  const slug = store?.slug ?? null;
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const reload = useCallback(() => {
    if (!slug) return setSettings(FALLBACK_SETTINGS);
    api<StoreSettings>('/settings', { store: slug }).then(setSettings).catch(() => {});
  }, [slug]);
  useEffect(reload, [reload]);
  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);

/** Cài đặt của một cửa hàng bất kỳ (VD: đơn hàng của cửa hàng khác) */
export function useStoreSettings(slug?: string | null) {
  const [s, setS] = useState<StoreSettings | null>(null);
  useEffect(() => { if (slug) api<StoreSettings>('/settings', { store: slug }).then(setS).catch(() => {}); }, [slug]);
  return s;
}

/** Cài đặt của cửa hàng đang quản lý (nhân viên / super admin quản trị hộ) – dùng cho POS, in hoá đơn */
export function useAdminSettings() {
  const [s, setS] = useState<StoreSettings>(FALLBACK_SETTINGS);
  useEffect(() => { api<StoreSettings>('/admin/settings').then(setS).catch(() => {}); }, []);
  return { settings: s };
}
