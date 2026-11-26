'use client';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSettings } from '@/context/settings';
import { money, vietQrUrl } from '@/lib/format';
import type { StoreSettings } from '@/lib/types';

export function BankTransferBox({ code, amount, bank }: { code: string; amount: number; bank?: StoreSettings['bank'] }) {
  const { settings } = useSettings();
  const toast = useToast();
  const b = bank ?? settings.bank;
  if (!b.accountNo) return null;
  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast('Đã sao chép'); };
  const row = (label: string, value: string, copyable = false) => (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-semibold text-ink">{value}{copyable && <button onClick={() => copy(value)} className="text-brand-600" aria-label="Sao chép"><Copy className="h-4 w-4" /></button>}</span>
    </div>
  );
  return (
    <div className="grid items-center gap-6 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-5 sm:grid-cols-[220px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={vietQrUrl(b, amount, code)} alt="Mã QR chuyển khoản" className="mx-auto w-full max-w-[220px] rounded-xl bg-white p-2 shadow-sm" />
      <div>
        <h3 className="font-bold text-ink">Quét mã QR để thanh toán</h3>
        <p className="mb-2 text-sm text-slate-500">Mở app ngân hàng → Quét QR. Số tiền và nội dung đã được điền sẵn.</p>
        {row('Ngân hàng', b.bankName)}
        {row('Số tài khoản', b.accountNo, true)}
        {row('Chủ tài khoản', b.accountName)}
        {row('Số tiền', money(amount))}
        {row('Nội dung', code, true)}
        <p className="mt-2 text-xs text-slate-400">Cửa hàng sẽ xác nhận ngay khi nhận được tiền.</p>
      </div>
    </div>
  );
}
