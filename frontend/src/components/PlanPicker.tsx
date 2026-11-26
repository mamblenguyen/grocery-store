'use client';
import { Check, PackagePlus } from 'lucide-react';
import { QtyInput } from '@/components/ui';
import { type AddonChoice, type AddonPack, LIMIT_UNIT, type LimitKind, packDuration } from '@/lib/billing';
import { money } from '@/lib/format';

export interface PlanOption {
  id: number; code?: string; name: string; description?: string | null; priceMonthly: number;
  maxProducts: number | null; maxStaff: number | null; maxOrdersMonthly: number | null; maxCampaignsMonthly?: number | null;
}
export interface PlanValue { planId: string; months: number; addons: AddonChoice[] }

/** Gói mặc định cho đối tác mới: gói mã "free", nếu không có thì gói 0đ đầu tiên */
export const defaultPlanId = (plans: PlanOption[]) => String((plans.find((p) => p.code === 'free') ?? plans.find((p) => p.priceMonthly === 0))?.id ?? '');

export function quoteOf(plans: PlanOption[], packs: AddonPack[], v: PlanValue) {
  const plan = plans.find((p) => String(p.id) === v.planId) ?? plans.find((p) => String(p.id) === defaultPlanId(plans)) ?? null;
  const free = !plan || plan.priceMonthly === 0;
  const months = free ? 0 : v.months;
  const lines = v.addons
    .map((a) => ({ a, p: packs.find((x) => x.id === a.packId) }))
    .filter((x): x is { a: AddonChoice; p: AddonPack } => !!x.p && x.a.units > 0)
    .map(({ a, p }) => ({ pack: p, units: a.units, price: p.price * a.units, quantity: p.quantity * a.units }));
  const planAmount = (plan?.priceMonthly ?? 0) * months;
  const addonsAmount = lines.reduce((s, l) => s + l.price, 0);
  return { plan, free, months, lines, planAmount, addonsAmount, total: planAmount + addonsAmount };
}

const lim = (n: number | null | undefined, unit: string) => (n == null ? `Không giới hạn ${unit}` : `${n.toLocaleString('vi-VN')} ${unit}`);

/** Chọn gói chính + số tháng + gói mua thêm (dùng ở đăng ký đối tác, thẩm định hồ sơ) */
export function PlanPicker({ plans, packs, value, onChange, monthsOptions = [1, 3, 6, 12, 24] }: {
  plans: PlanOption[]; packs: AddonPack[]; value: PlanValue; onChange: (v: PlanValue) => void; monthsOptions?: number[];
}) {
  const q = quoteOf(plans, packs, value);
  const units = (id: number) => value.addons.find((a) => a.packId === id)?.units ?? 0;
  const setUnits = (id: number, n: number) =>
    onChange({ ...value, addons: [...value.addons.filter((a) => a.packId !== id), ...(n > 0 ? [{ packId: id, units: n }] : [])] });
  // Gói chính đã không giới hạn loại này → ẩn gói mua thêm tương ứng
  const useful = packs.filter((p) => {
    const max = { products: q.plan?.maxProducts, staff: q.plan?.maxStaff, ordersMonthly: q.plan?.maxOrdersMonthly, campaignsMonthly: q.plan?.maxCampaignsMonthly }[p.kind as LimitKind];
    return !q.plan || max != null;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const on = q.plan?.id === p.id;
          return (
            <button type="button" key={p.id} onClick={() => onChange({ ...value, planId: String(p.id) })}
              className={`relative rounded-xl border p-3 text-left transition ${on ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 hover:border-brand-400'}`}>
              {on && <Check className="absolute top-2 right-2 h-4 w-4 text-brand-700" />}
              <div className="font-bold text-ink">{p.name}</div>
              <div className="text-sm font-semibold text-brand-700">{p.priceMonthly ? `${money(p.priceMonthly)}/tháng` : 'Miễn phí · không thời hạn'}</div>
              <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                <li>{lim(p.maxProducts, 'sản phẩm')}</li>
                <li>{lim(p.maxOrdersMonthly, 'đơn/tháng')}</li>
                <li>{lim(p.maxStaff, 'nhân viên')}</li>
              </ul>
            </button>
          );
        })}
      </div>

      {!q.free && (
        <div className="flex items-center gap-3">
          <label className="label mb-0">Số tháng</label>
          <select className="input w-32" value={value.months} onChange={(e) => onChange({ ...value, months: Number(e.target.value) })}>
            {[...new Set([...monthsOptions, value.months])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} tháng</option>)}
          </select>
        </div>
      )}

      {useful.length > 0 && (
        <div className="rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm font-semibold text-ink"><PackagePlus className="h-4 w-4 text-brand-600" /> Mua thêm hạn mức (tuỳ chọn)</div>
          <div className="divide-y divide-slate-100">
            {useful.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="text-xs text-slate-500">+{p.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[p.kind]} · {packDuration(p.months)}{p.description ? ` · ${p.description}` : ''}</div>
                </div>
                <div className="w-24 text-right font-semibold text-brand-700">{money(p.price)}</div>
                <QtyInput size="sm" min={0} max={20} value={units(p.id)} onChange={(n) => setUnits(p.id, n)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <div className="flex justify-between"><span>Gói {q.plan?.name ?? '—'}{q.free ? ' (không thời hạn)' : ` × ${q.months} tháng`}</span><b>{money(q.planAmount)}</b></div>
        {q.lines.map((l) => <div key={l.pack.id} className="flex justify-between text-slate-600"><span>{l.pack.name}{l.units > 1 && ` × ${l.units}`}</span><span>{money(l.price)}</span></div>)}
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-base"><span className="font-semibold">Tạm tính (đã gồm thuế)</span><b className="text-brand-700">{money(q.total)}</b></div>
      </div>
    </div>
  );
}
