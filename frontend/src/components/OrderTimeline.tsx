import { ORDER_STATUS } from '@/lib/format';

const FLOW = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'];

export function OrderTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED') return <div className="rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-600">Đơn hàng đã bị huỷ</div>;
  const idx = FLOW.indexOf(status);
  return (
    <div className="flex items-center">
      {FLOW.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i <= idx ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs whitespace-nowrap ${i <= idx ? 'text-brand-700' : 'text-gray-400'}`}>{ORDER_STATUS[s].label}</span>
          </div>
          {i < FLOW.length - 1 && <div className={`mx-2 mb-5 h-1 flex-1 rounded ${i < idx ? 'bg-brand-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}
