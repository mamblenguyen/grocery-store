import { Check, CircleX, ClipboardCheck, Package, Truck } from 'lucide-react';

const FLOW = [
  { k: 'PENDING', label: 'Đặt hàng', icon: Package },
  { k: 'CONFIRMED', label: 'Đã xác nhận', icon: ClipboardCheck },
  { k: 'SHIPPING', label: 'Đang giao', icon: Truck },
  { k: 'COMPLETED', label: 'Hoàn thành', icon: Check },
];

export function OrderTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED')
    return <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 p-4 text-sm font-medium text-slate-600"><CircleX className="h-5 w-5" /> Đơn hàng đã bị huỷ</div>;
  const idx = FLOW.findIndex((f) => f.k === status);
  return (
    <div className="flex items-start">
      {FLOW.map((s, i) => (
        <div key={s.k} className="flex flex-1 items-start last:flex-none">
          <div className="flex w-20 flex-col items-center gap-2 text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition ${i <= idx ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'bg-slate-100 text-slate-400'}`}><s.icon className="h-5 w-5" /></div>
            <span className={`text-xs font-semibold ${i <= idx ? 'text-brand-700' : 'text-slate-400'}`}>{s.label}</span>
          </div>
          {i < FLOW.length - 1 && <div className={`mt-5 h-1 flex-1 rounded-full ${i < idx ? 'bg-brand-600' : 'bg-slate-100'}`} />}
        </div>
      ))}
    </div>
  );
}
