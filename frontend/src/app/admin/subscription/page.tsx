'use client';
import { BadgeCheck, CalendarClock, Megaphone, Package, PackagePlus, Receipt, ShoppingCart, Users, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Modal, QtyInput, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { type AddonPack, isLive, LIMIT_KINDS, LIMIT_LABEL, LIMIT_UNIT, type LimitKind, type Limits, packDuration, PURCHASE_STATUS, type StorePurchase, type Usage } from '@/lib/billing';
import { ROOT_DOMAIN, storeUrl } from '@/lib/platform';
import { date, money, vietQrUrl } from '@/lib/format';
import type { Plan } from '@/lib/types';

interface Sub {
  store: { id: number; slug: string; name: string; status: string; planExpiresAt: string | null; createdAt: string; daysLeft: number | null; plan: Plan | null };
  usage: Usage;
  limits: Limits;
  payments: { id: number; months: number; amount: number; periodFrom: string; periodTo: string; method?: string | null; note?: string | null; createdAt: string; plan?: { name: string } | null }[];
  purchases: StorePurchase[];
  plans: Plan[];
  packs: AddonPack[];
  bank: { bankBin: string; bankName: string; accountNo: string; accountName: string };
}

const ICON: Record<LimitKind, React.ReactNode> = {
  products: <Package className="h-4 w-4" />, ordersMonthly: <ShoppingCart className="h-4 w-4" />, staff: <Users className="h-4 w-4" />, campaignsMonthly: <Megaphone className="h-4 w-4" />,
};

function Meter({ kind, used, l }: { kind: LimitKind; used: number; l: Limits[LimitKind] }) {
  const pct = l.max ? Math.min(100, Math.round((used / l.max) * 100)) : 0;
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">{ICON[kind]}{LIMIT_LABEL[kind]}{kind === 'staff' && <span className="text-xs">(không tính chủ)</span>}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{used.toLocaleString('vi-VN')}<span className="text-base font-medium text-slate-400"> / {l.max == null ? 'không giới hạn' : l.max.toLocaleString('vi-VN')}</span></div>
      {l.extra > 0 && l.base != null && <div className="text-xs text-slate-500">Gói {l.base.toLocaleString('vi-VN')} + mua thêm <b className="text-brand-700">{l.extra.toLocaleString('vi-VN')}</b></div>}
      {l.max != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}

export default function SubscriptionPage() {
  const toast = useToast();
  const [d, setD] = useState<Sub | null>(null);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [buy, setBuy] = useState<{ pack: AddonPack; units: number } | null>(null);
  const [change, setChange] = useState<{ plan: Plan; months: number } | null>(null);
  const [pay, setPay] = useState<StorePurchase | null>(null);
  useEffect(() => { api<Sub>('/admin/subscription').then(setD).catch((e) => setErr(e.message)); }, []);
  const link = d ? (ROOT_DOMAIN ? storeUrl(d.store.slug) : `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${d.store.slug}`) : '';
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 1, width: 360 }).then(setQr); }, [link]);
  if (err) return <div className="card text-center text-slate-500">{err}</div>;
  if (!d) return <Spinner />;
  const { store: s } = d;
  const expired = s.daysLeft != null && s.daysLeft <= 0;
  const pending = d.purchases.filter((p) => p.status === 'PENDING');
  const liveAddons = d.purchases.filter((p) => p.type === 'ADDON' && isLive(p));
  const packs = d.packs.filter((p) => d.limits[p.kind]?.base != null || !s.plan);

  const order = async (json: unknown, msg: string) => {
    setBusy(true);
    try {
      const r = await api<Sub>('/admin/subscription/purchases', { method: 'POST', json });
      setD(r); setBuy(null); setChange(null); toast(msg);
      const created = r.purchases.find((p) => p.status === 'PENDING' && !d.purchases.some((x) => x.id === p.id));
      if (created) setPay(created);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const cancel = async (p: StorePurchase) => {
    if (!(await confirmDialog('Huỷ đơn mua?', `${p.name} – ${money(p.amount)}`, 'Huỷ đơn', true))) return;
    try { setD(await api<Sub>(`/admin/subscription/purchases/${p.id}/cancel`, { method: 'POST' })); toast('Đã huỷ đơn'); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Gói dịch vụ</h1>
      <div className={`card flex flex-wrap items-center gap-4 ${expired ? 'border-red-200 bg-red-50' : ''}`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><BadgeCheck className="h-7 w-7" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-slate-500">Gói đang dùng</div>
          <div className="text-xl font-bold text-ink">{s.plan?.name ?? 'Chưa gán gói'}{s.plan && <span className="ml-2 text-base font-medium text-slate-500">{s.plan.priceMonthly ? `${money(s.plan.priceMonthly)}/tháng` : 'Miễn phí'}</span>}</div>
          {liveAddons.length > 0 && <div className="mt-1 text-sm text-slate-500">+ {liveAddons.length} gói mua thêm đang hiệu lực</div>}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> Hạn sử dụng</div>
          <div className={`text-lg font-bold ${expired ? 'text-red-600' : s.daysLeft != null && s.daysLeft <= 7 ? 'text-amber-600' : 'text-ink'}`}>
            {s.planExpiresAt ? `${date(s.planExpiresAt)} · ${expired ? 'đã hết hạn' : `còn ${s.daysLeft} ngày`}` : 'Không thời hạn'}
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card space-y-2 border-amber-200 bg-amber-50/60">
          <h2 className="flex items-center gap-2 font-bold text-amber-900"><Receipt className="h-5 w-5" /> Đơn chờ thanh toán</h2>
          {pending.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 text-sm">
              <div className="min-w-0 flex-1"><div className="font-semibold text-ink">{p.name}</div><div className="text-xs text-slate-500">Mã <span className="font-mono">{p.code}</span> · {date(p.createdAt)}</div></div>
              <b className="text-brand-700">{money(p.amount)}</b>
              <button className="btn-primary btn-sm" onClick={() => setPay(p)}>Thanh toán</button>
              <button className="btn-ghost btn-sm text-red-600" onClick={() => cancel(p)}><X className="h-4 w-4" /></button>
            </div>
          ))}
          <p className="text-xs text-amber-800">Sau khi chuyển khoản đúng nội dung, sàn đối soát và kích hoạt trong giờ làm việc – bạn sẽ nhận thông báo.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LIMIT_KINDS.map((k) => <Meter key={k} kind={k} used={d.usage[k]} l={d.limits[k]} />)}
      </div>

      {packs.length > 0 && (
        <div className="card">
          <h2 className="flex items-center gap-2 font-bold"><PackagePlus className="h-5 w-5 text-brand-600" /> Mua thêm hạn mức</h2>
          <p className="text-sm text-slate-500">Chỉ cần thêm một ít sản phẩm, đơn hàng hay nhân viên? Mua thêm đúng phần cần dùng, không phải đổi gói.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {packs.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">{ICON[p.kind]}{LIMIT_LABEL[p.kind]}</div>
                <div className="mt-1 font-bold text-ink">{p.name}</div>
                <div className="text-xs text-slate-500">+{p.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[p.kind]} · {packDuration(p.months)}</div>
                {p.description && <p className="mt-1 text-xs text-slate-400">{p.description}</p>}
                <div className="mt-auto flex items-end justify-between pt-3">
                  <div className="text-lg font-extrabold text-brand-700">{money(p.price)}</div>
                  <button className="btn-outline btn-sm" onClick={() => setBuy({ pack: p, units: 1 })}>Mua</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-bold">Đổi / gia hạn gói</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {d.plans.map((p) => {
            const cur = p.id === s.plan?.id;
            return (
              <div key={p.id} className={`flex flex-col rounded-2xl border p-4 ${cur ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between"><b>{p.name}</b>{cur && <span className="badge bg-brand-600 text-white">Đang dùng</span>}</div>
                <div className="mt-1 text-lg font-bold">{p.priceMonthly ? `${money(p.priceMonthly)}/tháng` : 'Miễn phí'}</div>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-500">
                  <li>{p.maxProducts == null ? 'Không giới hạn sản phẩm' : `${p.maxProducts.toLocaleString('vi-VN')} sản phẩm`}</li>
                  <li>{p.maxOrdersMonthly == null ? 'Không giới hạn đơn' : `${p.maxOrdersMonthly.toLocaleString('vi-VN')} đơn/tháng`}</li>
                  <li>{p.maxStaff == null ? 'Không giới hạn nhân viên' : `${p.maxStaff} nhân viên`}</li>
                </ul>
                <div className="mt-auto pt-3">
                  {(!cur || p.priceMonthly > 0) && (
                    <button className="btn-outline btn-sm w-full justify-center" onClick={() => setChange({ plan: p, months: 1 })}>
                      {cur ? 'Gia hạn' : p.priceMonthly ? `Chuyển sang ${p.name}` : 'Chuyển về gói miễn phí'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-500">Gia hạn / đổi gói trả phí: thời hạn được cộng tiếp từ ngày hết hạn hiện tại sau khi sàn xác nhận thanh toán. Khi hết hạn, cửa hàng tạm ngưng nhận đơn online.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="QR cửa hàng" className="h-36 w-36 rounded-xl border border-slate-200" />}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-bold">Mã QR cửa hàng</h2>
          <p className="text-sm text-slate-500">In và dán tại quầy: khách quét bằng camera điện thoại hoặc trong app để mở đúng cửa hàng của bạn.</p>
          <a href={link} target="_blank" className="link block truncate text-sm">{link}</a>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(link)}>Sao chép link</button>
            {qr && <a className="btn-primary btn-sm" href={qr} download={`qr-${s.slug}.png`}>Tải ảnh QR</a>}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-bold">Đơn mua thêm & đổi gói</h2>
        <table className="table">
          <thead><tr><th>Ngày</th><th>Mã</th><th>Nội dung</th><th>Hiệu lực</th><th className="text-right">Số tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {d.purchases.length ? d.purchases.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{date(p.createdAt)}</td><td className="font-mono text-xs">{p.code}</td>
                <td>{p.name}{p.type === 'ADDON' && p.kind && <div className="text-xs text-slate-500">+{p.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[p.kind]}</div>}</td>
                <td className="text-xs">{p.status === 'ACTIVE' ? (p.expiresAt ? `đến ${date(p.expiresAt)}${isLive(p) ? '' : ' (đã hết)'}` : 'Không thời hạn') : '—'}</td>
                <td className="text-right font-semibold">{money(p.amount)}</td>
                <td><span className={`badge ${PURCHASE_STATUS[p.status].cls}`}>{PURCHASE_STATUS[p.status].label}</span></td>
              </tr>
            )) : <tr><td colSpan={6} className="text-center text-slate-400">Chưa có đơn mua</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-bold">Lịch sử thanh toán phí dịch vụ</h2>
        <table className="table">
          <thead><tr><th>Ngày</th><th>Nội dung</th><th>Số tháng</th><th>Thời hạn</th><th className="text-right">Số tiền</th><th>Hình thức</th></tr></thead>
          <tbody>
            {d.payments.length ? d.payments.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{date(p.createdAt)}</td><td>{p.plan?.name ?? p.note ?? '—'}</td><td>{p.months || '—'}</td>
                <td className="text-xs">{p.months ? `${date(p.periodFrom)} → ${date(p.periodTo)}` : '—'}</td><td className="text-right font-semibold">{money(p.amount)}</td><td>{p.method || '—'}</td>
              </tr>
            )) : <tr><td colSpan={6} className="text-center text-slate-400">Chưa có thanh toán</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!buy} onClose={() => setBuy(null)} title="Mua thêm hạn mức">
        {buy && (
          <div className="space-y-4">
            <div><div className="font-bold text-ink">{buy.pack.name}</div><div className="text-sm text-slate-500">+{buy.pack.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[buy.pack.kind]} mỗi gói · hiệu lực {packDuration(buy.pack.months)} kể từ khi sàn xác nhận thanh toán</div></div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="text-sm">Số lượng</span><QtyInput min={1} max={20} value={buy.units} onChange={(units) => setBuy({ ...buy, units })} /></div>
              <div className="text-right text-sm">+{(buy.pack.quantity * buy.units).toLocaleString('vi-VN')} {LIMIT_UNIT[buy.pack.kind]}<div className="text-xl font-extrabold text-brand-700">{money(buy.pack.price * buy.units)}</div></div>
            </div>
            <p className="text-xs text-slate-500">Giá đã gồm thuế. Sàn xuất hoá đơn điện tử cho khoản phí này.</p>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setBuy(null)}>Huỷ</button><button className="btn-primary" disabled={busy} onClick={() => order({ type: 'ADDON', packId: buy.pack.id, units: buy.units }, 'Đã tạo đơn – vui lòng thanh toán')}>Đặt mua</button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!change} onClose={() => setChange(null)} title={change?.plan.id === s.plan?.id ? 'Gia hạn gói' : 'Đổi gói dịch vụ'}>
        {change && (
          <div className="space-y-4">
            <div className="font-bold text-ink">Gói {change.plan.name} · {change.plan.priceMonthly ? `${money(change.plan.priceMonthly)}/tháng` : 'Miễn phí'}</div>
            {change.plan.priceMonthly > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="text-sm">Số tháng</span>
                  <select className="input w-32" value={change.months} onChange={(e) => setChange({ ...change, months: Number(e.target.value) })}>{[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} tháng</option>)}</select></div>
                <div className="text-xl font-extrabold text-brand-700">{money(change.plan.priceMonthly * change.months)}</div>
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Chuyển về gói miễn phí có hiệu lực ngay: thời hạn gói trả phí còn lại (nếu có) không được hoàn tiền; hạn mức về mức gói miễn phí (dữ liệu hiện có được giữ nguyên, chỉ không thêm mới khi vượt hạn mức).</p>
            )}
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setChange(null)}>Huỷ</button>
              <button className="btn-primary" disabled={busy} onClick={() => order({ type: 'PLAN', planId: change.plan.id, months: change.plan.priceMonthly ? change.months : 0 }, change.plan.priceMonthly ? 'Đã tạo đơn – vui lòng thanh toán' : 'Đã chuyển gói')}>{change.plan.priceMonthly ? 'Đặt mua' : 'Xác nhận chuyển'}</button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!pay} onClose={() => setPay(null)} title="Thanh toán đơn mua">
        {pay && (
          <div className="space-y-3">
            <div className="text-sm"><b>{pay.name}</b> – mã đơn <span className="font-mono">{pay.code}</span></div>
            {d.bank.accountNo ? (
              <div className="flex flex-wrap items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vietQrUrl(d.bank, pay.amount, pay.code)} alt="VietQR" className="h-44 w-44 rounded-xl border" />
                <div className="space-y-1 text-sm">
                  <div>Ngân hàng: <b>{d.bank.bankName}</b></div>
                  <div>Số tài khoản: <b className="font-mono">{d.bank.accountNo}</b></div>
                  <div>Chủ tài khoản: <b>{d.bank.accountName}</b></div>
                  <div>Số tiền: <b className="text-brand-700">{money(pay.amount)}</b></div>
                  <div>Nội dung: <b className="font-mono">{pay.code}</b></div>
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">Sàn chưa khai báo tài khoản nhận phí – vui lòng liên hệ quản trị sàn để thanh toán.</p>}
            <p className="text-xs text-slate-400">Sàn đối soát thủ công và kích hoạt trong giờ làm việc. Hạn mức được cộng ngay khi kích hoạt.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
