import { ArrowRight, Banknote, Bike, Store, User } from 'lucide-react';
import { money } from '@/lib/format';
import { settlement } from '@/lib/shipper';

/**
 * Tiền của 1 chuyến giao: ai trả ai bao nhiêu (thanh toán trực tiếp, không qua sàn).
 * viewer = 'shipper' (app tài xế) hoặc 'store' (trang đơn của cửa hàng) – đổi cách xưng hô.
 */
export function DeliveryMoney({ fee, codAmount, viewer, compact = false }: { fee: number; codAmount: number; viewer: 'shipper' | 'store'; compact?: boolean }) {
  const s = settlement({ fee, codAmount });
  const me = viewer === 'shipper';
  const steps: { icon: React.ReactNode; from: string; to: string; amount: number; when: string; tone: string }[] = [];
  if (s.collect) steps.push({ icon: <User className="h-4 w-4" />, from: 'Khách', to: me ? 'Bạn' : 'Tài xế', amount: s.collect, when: 'khi giao hàng (tiền mặt/chuyển khoản)', tone: 'bg-amber-50 text-amber-900' });
  if (s.storePaysShipper) steps.push({ icon: <Store className="h-4 w-4" />, from: me ? 'Cửa hàng' : 'Cửa hàng (bạn)', to: me ? 'Bạn' : 'Tài xế', amount: s.storePaysShipper, when: codAmount ? 'bù phần phí ship còn thiếu, khi lấy hàng' : 'phí ship – trả khi tài xế đến lấy hàng', tone: 'bg-sky-50 text-sky-900' });
  if (s.shipperPaysStore) steps.push({ icon: <Bike className="h-4 w-4" />, from: me ? 'Bạn' : 'Tài xế', to: me ? 'Cửa hàng' : 'Cửa hàng (bạn)', amount: s.shipperPaysStore, when: `sau khi giao – đã giữ lại phí ship ${money(fee)}`, tone: 'bg-rose-50 text-rose-900' });

  if (compact)
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        {steps.filter((x) => x.from !== 'Khách').map((x, i) => (
          <span key={i} className={`badge ${x.tone}`}><Banknote className="h-3 w-3" />{x.from} → {x.to} {money(x.amount)}</span>
        ))}
      </div>
    );

  return (
    <div className="space-y-2" data-testid="delivery-money">
      {steps.map((x, i) => (
        <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${x.tone}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">{x.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 font-semibold">{x.from} <ArrowRight className="h-3.5 w-3.5" /> {x.to}</div>
            <div className="text-xs opacity-80">{x.when}</div>
          </div>
          <b className="text-base">{money(x.amount)}</b>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        {me ? <>Thu nhập chuyến này: <b className="text-brand-700">{money(fee)}</b>. </> : <>Phí trả tài xế: <b>{money(fee)}</b>. </>}
        Tiền thanh toán trực tiếp giữa tài xế và cửa hàng, không qua sàn.
      </p>
    </div>
  );
}
