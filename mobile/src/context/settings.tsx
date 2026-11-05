import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';

const FALLBACK: StoreSettings = {
  storeName: 'Tạp Hoá Xanh', slogan: 'Đi chợ online – Tươi ngon mỗi ngày', logo: '', hotline: '', email: '', address: '', openingHours: '',
  announcement: '', taxCode: '', vatRate: 0, invoiceFooter: '', shippingFee: 20000, freeShippingThreshold: 300000, minOrderValue: 0,
  deliverySlots: [], deliveryDaysAhead: 3, payment: { cod: true, bankTransfer: false, vnpay: false },
  bank: { bankBin: '', bankName: '', accountNo: '', accountName: '' }, banners: [], social: { facebook: '', zalo: '', tiktok: '', youtube: '' },
};
const Ctx = createContext<{ settings: StoreSettings; reload: () => void }>({ settings: FALLBACK, reload: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(FALLBACK);
  const reload = () => { api<StoreSettings>('/settings').then(setSettings).catch(() => {}); };
  useEffect(reload, []);
  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);
