'use client';
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ConfirmDialog';
import { promptDialog } from '@/components/PromptDialog';
import { useToast } from '@/components/Toast';
import { Modal, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { type AddonPack, LIMIT_KINDS, LIMIT_LABEL, LIMIT_UNIT, type LimitKind, packDuration, PURCHASE_SOURCE, PURCHASE_STATUS, type PurchaseStatus, type StorePurchase } from '@/lib/billing';
import { dateTime, money } from '@/lib/format';
import { METHODS } from '@/lib/super';

type PackForm = { id?: number; code: string; name: string; description: string; kind: LimitKind; quantity: string; price: string; months: string; isActive: boolean; sortOrder: string };
const toForm = (p?: AddonPack): PackForm => ({
  id: p?.id, code: p?.code ?? '', name: p?.name ?? '', description: p?.description ?? '', kind: p?.kind ?? 'products',
  quantity: String(p?.quantity ?? 30), price: String(p?.price ?? 150000), months: String(p?.months ?? 0), isActive: p?.isActive ?? true, sortOrder: String(p?.sortOrder ?? 0),
});
interface PurchasePage { items: StorePurchase[]; total: number; page: number; totalPages: number; counts: Partial<Record<PurchaseStatus, number>> }

function Orders() {
  const toast = useToast();
  const [status, setStatus] = useState<PurchaseStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<PurchasePage | null>(null);
  const [confirm, setConfirm] = useState<{ p: StorePurchase; amount: string; method: string; ref: string } | null>(null);
  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), limit: '20', ...(status && { status }), ...(search && { search }) });
    api<PurchasePage>(`/super/purchases?${q}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [page, status, search, toast]);
  useEffect(() => { load(); }, [load]);

  const doConfirm = async () => {
    if (!confirm) return;
    try {
      await api(`/super/purchases/${confirm.p.id}/confirm`, { method: 'POST', json: { amount: Number(confirm.amount), method: confirm.method, ref: confirm.ref || undefined } });
      toast('Đã kích hoạt'); setConfirm(null); load();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const cancel = async (p: StorePurchase) => {
    const revoke = p.status === 'ACTIVE';
    const note = await promptDialog({ title: revoke ? 'Thu hồi hạn mức đã cấp' : 'Huỷ đơn mua', label: 'Lý do (gửi cho cửa hàng)', confirmText: revoke ? 'Thu hồi' : 'Huỷ đơn', destructive: true });
    if (note === null || note === undefined) return;
    try { await api(`/super/purchases/${p.id}/cancel`, { method: 'POST', json: { note: note || undefined } }); toast(revoke ? 'Đã thu hồi' : 'Đã huỷ'); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['PENDING', 'ACTIVE', 'CANCELLED', ''] as const).map((s) => (
          <button key={s || 'all'} className={`chip ${status === s ? 'chip-active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>
            {s ? PURCHASE_STATUS[s].label : 'Tất cả'}{s && data?.counts[s] ? ` (${data.counts[s]})` : ''}
          </button>
        ))}
        <input className="input ml-auto w-64" placeholder="Mã đơn, tên gói, cửa hàng…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : (
          <table className="table">
            <thead><tr><th>Ngày</th><th>Mã (nội dung CK)</th><th>Cửa hàng</th><th>Nội dung</th><th className="text-right">Số tiền</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {data.items.length ? data.items.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs">{dateTime(p.createdAt)}</td>
                  <td className="font-mono text-xs">{p.code}</td>
                  <td>{p.store ? <Link className="link" href={`/super/stores/${p.store.id}`}>{p.store.name}</Link> : '—'}</td>
                  <td>{p.name}<div className="text-xs text-slate-500">{p.type === 'ADDON' && p.kind ? `+${p.quantity.toLocaleString('vi-VN')} ${LIMIT_UNIT[p.kind]} · ${packDuration(p.months)}` : 'Đổi / gia hạn gói'} · {PURCHASE_SOURCE[p.source]}</div>
                    {p.paymentRef && <div className="text-xs text-slate-400">GD: {p.paymentRef}</div>}</td>
                  <td className="text-right font-semibold">{money(p.amount)}</td>
                  <td><span className={`badge ${PURCHASE_STATUS[p.status].cls}`}>{PURCHASE_STATUS[p.status].label}</span>{p.status === 'ACTIVE' && p.expiresAt && <div className="text-xs text-slate-400">đến {new Date(p.expiresAt).toLocaleDateString('vi-VN')}</div>}</td>
                  <td className="space-x-1 text-right whitespace-nowrap">
                    {p.status === 'PENDING' && <button className="btn-primary btn-sm" onClick={() => setConfirm({ p, amount: String(p.amount), method: METHODS[0], ref: '' })}><CheckCircle2 className="h-4 w-4" /> Đã nhận tiền</button>}
                    {(p.status === 'PENDING' || (p.status === 'ACTIVE' && p.type === 'ADDON')) && <button className="btn-ghost btn-sm text-red-600" title={p.status === 'ACTIVE' ? 'Thu hồi' : 'Huỷ'} onClick={() => cancel(p)}><XCircle className="h-4 w-4" /></button>}
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="text-center text-slate-400">Không có đơn</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Xác nhận đã nhận thanh toán">
        {confirm && (
          <div className="space-y-3">
            <p className="text-sm"><b>{confirm.p.store?.name}</b> – {confirm.p.name}. Đối chiếu sao kê: nội dung chuyển khoản <b className="font-mono">{confirm.p.code}</b>.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Số tiền thực nhận (₫)</label><input className="input" type="number" min={0} value={confirm.amount} onChange={(e) => setConfirm({ ...confirm, amount: e.target.value })} /></div>
              <div><label className="label">Hình thức</label><select className="input" value={confirm.method} onChange={(e) => setConfirm({ ...confirm, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
            </div>
            <div><label className="label">Mã giao dịch ngân hàng</label><input className="input font-mono" value={confirm.ref} onChange={(e) => setConfirm({ ...confirm, ref: e.target.value })} /></div>
            <p className="text-xs text-slate-500">Kích hoạt ngay: cộng hạn mức / đổi gói, ghi phiếu thu và báo cho cửa hàng. Nhớ xuất hoá đơn điện tử của sàn cho khoản phí này.</p>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setConfirm(null)}>Huỷ</button><button className="btn-primary" onClick={doConfirm}>Xác nhận & kích hoạt</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Packs() {
  const toast = useToast();
  const [list, setList] = useState<AddonPack[] | null>(null);
  const [f, setF] = useState<PackForm | null>(null);
  const load = useCallback(() => api<AddonPack[]>('/super/addon-packs').then(setList).catch((e) => toast(e.message, 'error')), [toast]);
  useEffect(() => { load(); }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: f!.code || undefined, name: f!.name, description: f!.description || null, kind: f!.kind, quantity: Number(f!.quantity), price: Number(f!.price || 0),
      months: Number(f!.months || 0), isActive: f!.isActive, sortOrder: Number(f!.sortOrder || 0),
    };
    try { await api(f!.id ? `/super/addon-packs/${f!.id}` : '/super/addon-packs', { method: f!.id ? 'PUT' : 'POST', json: body }); toast('Đã lưu'); setF(null); load(); }
    catch (err: any) { toast(err.message, 'error'); }
  };
  const remove = async (p: AddonPack) => {
    if (!(await confirmDialog(`Xoá gói "${p.name}"?`, 'Gói đã có lượt mua thì chỉ ngừng bán được.', 'Xoá', true))) return;
    try { await api(`/super/addon-packs/${p.id}`, { method: 'DELETE' }); toast('Đã xoá'); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Hạn mức mua thêm được cộng vào giới hạn của gói chính. Thời hạn 0 = dùng không thời hạn. Gói chính đã “không giới hạn” loại nào thì cửa hàng không thấy gói mua thêm loại đó.</p>
        <button className="btn-primary" onClick={() => setF(toForm())}><Plus className="h-4 w-4" /> Thêm gói mua thêm</button>
      </div>
      {!list ? <Spinner /> : LIMIT_KINDS.map((k) => {
        const items = list.filter((p) => p.kind === k);
        if (!items.length) return null;
        return (
          <section key={k}>
            <h3 className="mb-2 font-bold text-ink">{LIMIT_LABEL[k]}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((p) => (
                <div key={p.id} className={`card flex flex-col ${p.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2"><b>{p.name}</b><span className={`badge ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{p.isActive ? 'Đang bán' : 'Ngừng bán'}</span></div>
                  <div className="text-xs text-slate-400">Mã: {p.code}</div>
                  <div className="mt-2 text-xl font-extrabold text-violet-700">{money(p.price)}</div>
                  <div className="text-sm text-slate-600">+{p.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[p.kind]} · {packDuration(p.months)}</div>
                  {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
                  <div className="text-xs text-slate-400">Đã bán: {p._count?.purchases ?? 0} lượt</div>
                  <div className="mt-auto flex justify-end gap-2 pt-3">
                    <button className="btn-outline btn-sm" onClick={() => setF(toForm(p))}><Pencil className="h-3.5 w-3.5" /> Sửa</button>
                    <button className="btn-outline btn-sm text-red-600" disabled={!!p._count?.purchases} onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Sửa gói mua thêm' : 'Thêm gói mua thêm'}>
        {f && (
          <form className="space-y-3" onSubmit={save}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Tên gói *</label><input className="input" required minLength={2} value={f.name} placeholder="Thêm 30 sản phẩm" onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><label className="label">Mã gói</label><input className="input" value={f.code} placeholder="tự tạo từ tên" onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
            </div>
            <div><label className="label">Mô tả</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Loại hạn mức</label><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as LimitKind })}>{LIMIT_KINDS.map((k) => <option key={k} value={k}>{LIMIT_LABEL[k]}</option>)}</select></div>
              <div><label className="label">Cộng thêm ({LIMIT_UNIT[f.kind]})</label><input className="input" type="number" min={1} required value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
              <div><label className="label">Giá (₫, đã gồm thuế)</label><input className="input" type="number" min={0} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div><label className="label">Thời hạn (tháng, 0 = không thời hạn)</label><input className="input" type="number" min={0} max={36} value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} /></div>
              <div><label className="label">Thứ tự hiển thị</label><input className="input" type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></div>
              <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Đang bán</label>
            </div>
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">Hạn mức theo tháng (đơn hàng, chiến dịch) nên đặt thời hạn ≥ 1 tháng; hạn mức tồn tại (sản phẩm) có thể bán không thời hạn. Đổi giá không ảnh hưởng đơn đã mua.</p>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setF(null)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Inner() {
  const tab = useSearchParams().get('tab') === 'packs' ? 'packs' : 'orders';
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Gói mua thêm</h1><p className="text-sm text-slate-500">Cửa hàng mua thêm hạn mức (sản phẩm, đơn hàng, nhân viên, chiến dịch) hoặc đổi / gia hạn gói – sàn xác nhận thanh toán để kích hoạt.</p></div>
      <div className="flex gap-2">
        <button className={`chip ${tab === 'orders' ? 'chip-active' : ''}`} onClick={() => router.replace('/super/addons?tab=orders')}>Đơn mua của cửa hàng</button>
        <button className={`chip ${tab === 'packs' ? 'chip-active' : ''}`} onClick={() => router.replace('/super/addons?tab=packs')}>Bảng giá gói mua thêm</button>
      </div>
      {tab === 'orders' ? <Orders /> : <Packs />}
    </div>
  );
}

export default function AddonsPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
