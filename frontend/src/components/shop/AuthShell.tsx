'use client';
import { Leaf, ShieldCheck, Truck } from 'lucide-react';
import { useSettings } from '@/context/settings';
import { Logo } from './Header';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { settings } = useSettings();
  return (
    <div className="container-x py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-lift lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex">
          <Logo light />
          <div>
            <h2 className="text-3xl leading-tight font-extrabold">{settings.slogan}</h2>
            <ul className="mt-6 space-y-3 text-brand-50">
              <li className="flex items-center gap-3"><Truck className="h-5 w-5" /> Giao nhanh trong 2 giờ</li>
              <li className="flex items-center gap-3"><Leaf className="h-5 w-5" /> Hàng tươi nhập mỗi sáng</li>
              <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5" /> Thanh toán an toàn, đổi trả 7 ngày</li>
            </ul>
          </div>
          <div className="text-sm text-brand-100">{settings.hotline && `Hotline hỗ trợ: ${settings.hotline}`}</div>
        </div>
        <div className="p-6 sm:p-10">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 mb-6 text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
