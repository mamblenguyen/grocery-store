'use client';
import { DollarSign, Info, Package, Percent, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BarChart } from '@/components/admin/BarChart';
import { Spinner, StatCard } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { money, num, PAYMENT_METHOD } from '@/lib/format';

type Agg = { key: string; revenue: number; cogs: number; profit: number; orders: number; items: number };
interface Report {
  range: { from: string; to: string; groupBy: 'day' | 'month' };
  summary: { revenue: number; cogs: number; profit: number; orders: number; items: number; discount: number; shipping: number; margin: number; avgOrderValue: number; missingCost: number; missingVat: number };
  byVatRate: { key: string; label: string; revenue: number; preTax: number; vat: number; items: number }[];
  series: Agg[]; byPaymentMethod: Agg[]; byChannel: Agg[]; byCategory: Agg[];
  topProducts: (Omit<Agg, 'key'> & { name: string })[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function preset(k: string): [string, string] {
  const t = new Date();
  switch (k) {
    case 'today': return [ymd(t), ymd(t)];
    case '7d': { const f = new Date(t); f.setDate(t.getDate() - 6); return [ymd(f), ymd(t)]; }
    case '30d': { const f = new Date(t); f.setDate(t.getDate() - 29); return [ymd(f), ymd(t)]; }
    case 'lastMonth': return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))];
    case 'year': return [ymd(new Date(t.getFullYear(), 0, 1)), ymd(t)];
    default: return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(t)];
  }
}
const PRESETS = [['today', 'Hôm nay'], ['7d', '7 ngày'], ['30d', '30 ngày'], ['month', 'Tháng này'], ['lastMonth', 'Tháng trước'], ['year', 'Năm nay']];
const CHANNEL: Record<string, string> = { ONLINE: 'Online', POS: 'Tại quầy' };

function Breakdown({ title, rows, label }: { title: string; rows: Agg[]; label: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <div className="card">
      <h3 className="mb-4 font-bold text-ink">{title}</h3>
      {!rows.length && <div className="text-sm text-slate-400">Chưa có dữ liệu</div>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium text-ink">{label(r.key)}</span><span className="text-slate-500">{money(r.revenue)} · LN <b className={r.profit < 0 ? 'text-red-600' : 'text-brand-700'}>{money(r.profit)}</b></span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.revenue / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<[string, string]>(preset('month'));
  const [active, setActive] = useState('month');
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => { setR(null); api<Report>('/admin/reports/sales' + qs({ from: range[0], to: range[1] })).then(setR); }, [range]);
  const label = (k: string) => (r?.range.groupBy === 'month' ? `${k.slice(5)}/${k.slice(0, 4)}` : `${k.slice(8)}/${k.slice(5, 7)}`);
  const fullLabel = (k: string) => (r?.range.groupBy === 'month' ? `Tháng ${k.slice(5)}/${k.slice(0, 4)}` : `Ngày ${k.slice(8)}/${k.slice(5, 7)}/${k.slice(0, 4)}`);
  const pctOf = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString('vi-VN')}%` : '—');

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-2">{PRESETS.map(([k, l]) => <button key={k} className={`chip ${active === k ? 'chip-active' : ''}`} onClick={() => { setActive(k); setRange(preset(k)); }}>{l}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <input type="date" className="input w-auto" value={range[0]} onChange={(e) => { setActive(''); setRange([e.target.value, range[1]]); }} />
          <span className="text-slate-400">→</span>
          <input type="date" className="input w-auto" value={range[1]} onChange={(e) => { setActive(''); setRange([range[0], e.target.value]); }} />
        </div>
      </div>
      {!r ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard icon={<DollarSign className="h-5 w-5" />} label="Doanh thu hàng" value={money(r.summary.revenue)} hint={`Đã trừ giảm giá ${money(r.summary.discount)}`} />
            <StatCard icon={<Wallet className="h-5 w-5" />} tone="rose" label="Giá vốn hàng bán" value={money(r.summary.cogs)} />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} tone="sky" label="Lợi nhuận gộp" value={money(r.summary.profit)} />
            <StatCard icon={<Percent className="h-5 w-5" />} tone="violet" label="Biên lợi nhuận" value={`${r.summary.margin}%`} />
            <StatCard icon={<ReceiptText className="h-5 w-5" />} tone="accent" label="Đơn hoàn thành" value={num(r.summary.orders)} hint={`TB ${money(r.summary.avgOrderValue)}/đơn`} />
            <StatCard icon={<Package className="h-5 w-5" />} label="Sản phẩm đã bán" value={num(r.summary.items)} hint={`Phí ship thu: ${money(r.summary.shipping)}`} />
          </div>
          {r.summary.missingCost > 0 && <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />{r.summary.missingCost} dòng hàng chưa có giá vốn (đơn tạo trước khi cập nhật hoặc sản phẩm chưa nhập giá vốn) – lợi nhuận của các dòng này đang tính với giá vốn 0.</div>}

          <div className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-ink">Doanh thu & lợi nhuận theo {r.range.groupBy === 'month' ? 'tháng' : 'ngày'}</h3>
              <div className="flex gap-4 text-xs"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-200" /> Doanh thu</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-600" /> Lợi nhuận</span></div>
            </div>
            <BarChart
              data={r.series.map((x) => ({
                key: x.key,
                label: label(x.key),
                bar: { value: x.revenue, className: 'bg-brand-200' },
                overlay: { value: x.profit, className: 'bg-brand-600' },
                tooltip: {
                  title: fullLabel(x.key),
                  rows: [
                    { label: 'Doanh thu hàng', value: money(x.revenue), dot: 'bg-brand-200' },
                    { label: 'Giá vốn', value: money(x.cogs), tone: 'muted' as const },
                    { label: 'Lợi nhuận gộp', value: money(x.profit), tone: x.profit < 0 ? ('neg' as const) : ('pos' as const), dot: 'bg-brand-600' },
                    { label: 'Biên lợi nhuận', value: pctOf(x.profit, x.revenue), tone: 'muted' as const },
                    { label: 'Đơn hoàn thành', value: num(x.orders) },
                    { label: 'Sản phẩm bán', value: num(x.items), tone: 'muted' as const },
                  ],
                },
              }))}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Breakdown title="Theo danh mục" rows={r.byCategory} label={(k) => k} />
            <Breakdown title="Theo phương thức thanh toán" rows={r.byPaymentMethod} label={(k) => PAYMENT_METHOD[k]?.split(' (')[0] ?? k} />
            <Breakdown title="Theo kênh bán" rows={r.byChannel} label={(k) => CHANNEL[k] ?? k} />
          </div>

          <div className="card overflow-x-auto p-0">
            <div className="p-5 pb-2 font-bold text-ink">Top sản phẩm</div>
            <table className="table">
              <thead><tr><th>#</th><th>Sản phẩm</th><th className="text-right">SL bán</th><th className="text-right">Doanh thu</th><th className="text-right">Giá vốn</th><th className="text-right">Lợi nhuận</th><th className="text-right">Biên</th></tr></thead>
              <tbody>
                {r.topProducts.map((p, i) => (
                  <tr key={p.name + i}>
                    <td className="text-slate-400">{i + 1}</td><td className="font-semibold text-ink">{p.name}</td><td className="text-right">{num(p.items)}</td>
                    <td className="text-right">{money(p.revenue)}</td><td className="text-right text-slate-500">{money(p.cogs)}</td>
                    <td className={`text-right font-semibold ${p.profit < 0 ? 'text-red-600' : 'text-brand-700'}`}>{money(p.profit)}</td>
                    <td className="text-right text-sm">{p.revenue ? Math.round((p.profit / p.revenue) * 100) : 0}%</td>
                  </tr>
                ))}
                {!r.topProducts.length && <tr><td colSpan={7} className="py-10 text-center text-slate-400">Chưa có đơn hoàn thành trong kỳ</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card overflow-x-auto p-0">
            <div className="p-5 pb-2">
              <div className="font-bold text-ink">Tổng hợp thuế GTGT theo thuế suất</div>
              <p className="text-xs text-slate-500">Giá bán đã gồm thuế → tách ngược theo thuế suất khai báo ở từng sản phẩm (snapshot tại thời điểm bán). Số liệu tham khảo để đối chiếu với hoá đơn điện tử & tờ khai – số chính thức là số trên hoá đơn điện tử đã phát hành.</p>
            </div>
            <table className="table">
              <thead><tr><th>Thuế suất</th><th className="text-right">SL</th><th className="text-right">Doanh thu (gồm thuế)</th><th className="text-right">Chưa thuế</th><th className="text-right">Thuế GTGT</th></tr></thead>
              <tbody>
                {r.byVatRate.map((v) => (
                  <tr key={v.key}>
                    <td className={v.key === 'NA' ? 'text-amber-700' : 'font-medium text-ink'}>{v.label}</td>
                    <td className="text-right">{num(v.items)}</td><td className="text-right">{money(v.revenue)}</td>
                    <td className="text-right">{money(v.preTax)}</td><td className="text-right font-semibold">{money(v.vat)}</td>
                  </tr>
                ))}
                {!!r.byVatRate.length && (
                  <tr className="font-bold">
                    <td>Tổng</td><td className="text-right">{num(r.byVatRate.reduce((a, v) => a + v.items, 0))}</td>
                    <td className="text-right">{money(r.byVatRate.reduce((a, v) => a + v.revenue, 0))}</td>
                    <td className="text-right">{money(r.byVatRate.reduce((a, v) => a + v.preTax, 0))}</td>
                    <td className="text-right">{money(r.byVatRate.reduce((a, v) => a + v.vat, 0))}</td>
                  </tr>
                )}
                {!r.byVatRate.length && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Chưa có đơn hoàn thành trong kỳ</td></tr>}
              </tbody>
            </table>
            {r.summary.missingVat > 0 && <div className="m-4 mt-0 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />{r.summary.missingVat} dòng hàng chưa có thuế suất (đơn tạo trước khi khai báo thuế suất sản phẩm) – đang tính như không có thuế.</div>}
          </div>
        </>
      )}
    </div>
  );
}
