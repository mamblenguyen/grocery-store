'use client';
import { ArrowLeft, CalendarPlus, ExternalLink, KeyRound, PackagePlus, Pause, Play, Plus, ShieldCheck, UserMinus, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { promptDialog } from '@/components/PromptDialog';
import { type AddonPack, isLive, LIMIT_KINDS, LIMIT_LABEL, LIMIT_UNIT, type Limits, packDuration, PURCHASE_SOURCE, PURCHASE_STATUS, type StorePurchase, type Usage } from '@/lib/billing';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Modal, Spinner, StatCard } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { storeUrl } from '@/lib/platform';
import { date, money, num, ROLES } from '@/lib/format';
import { AddressFields } from '@/components/AddressFields';
import { PartnerFields, partnerForm, partnerPayload, type PartnerForm } from '@/components/super/PartnerFields';
import { type AddressParts, EMPTY_ADDRESS, toParts, toPayload } from '@/lib/vn-address';
import { BUSINESS_TYPES, expiryInfo, METHODS, STORE_STATUS, type StorePaymentRow, type SuperStore } from '@/lib/super';
import type { Plan, StoreStatus, User } from '@/lib/types';

type Detail = SuperStore & {
  members: User[];
  payments: StorePaymentRow[];
  stats: { revenue: number; orders: number; monthRevenue: number; monthOrders: number; customers: number; variants: number };
};

const toInputDate = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function SuperStoreDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { setActing } = useAuth();
  const [s, setS] = useState<Detail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [renew, setRenew] = useState<{ months: number; planId: string; amount: string; method: string; note: string } | null>(null);
  const [manual, setManual] = useState<{ planId: string; planExpiresAt: string } | null>(null);
  const [member, setMember] = useState<{ email: string; password: string; fullName: string; phone: string; role: 'ADMIN' | 'STAFF' } | null>(null);
  const [pwd, setPwd] = useState<{ u: User; value: string } | null>(null);
  const [partner, setPartner] = useState<PartnerForm | null>(null);
  const [addr, setAddr] = useState<AddressParts>(EMPTY_ADDRESS);
  const [addons, setAddons] = useState<{ limits: Limits; usage: Usage; purchases: StorePurchase[] } | null>(null);
  const [packs, setPacks] = useState<AddonPack[]>([]);
  const [grant, setGrant] = useState<{ packId: string; units: number; amount: string; method: string; ref: string; note: string } | null>(null);

  const apply = (d: Detail) => {
    setS(d);
    setInfo({ name: d.name, slug: d.slug, phone: d.phone ?? '', email: d.email ?? '', note: d.note ?? '' });
    setAddr(toParts(d));
  };
  const load = useCallback(() => api<Detail>(`/super/stores/${id}`).then(apply).catch((e) => toast(e.message, 'error')), [id, toast]);
  const loadAddons = useCallback(() => api<{ limits: Limits; usage: Usage; purchases: StorePurchase[] }>(`/super/stores/${id}/addons`).then(setAddons).catch(() => {}), [id]);
  useEffect(() => { load(); loadAddons(); api<Plan[]>('/super/plans').then(setPlans); api<AddonPack[]>('/super/addon-packs').then(setPacks); }, [load, loadAddons]);

  const patch = async (body: Record<string, unknown>, msg = 'Đã cập nhật') => {
    try { apply(await api<Detail>(`/super/stores/${id}`, { method: 'PATCH', json: body })); toast(msg); return true; }
    catch (e: any) { toast(e.message, 'error'); return false; }
  };
  const setStatus = async (status: StoreStatus) => {
    const msg = { ACTIVE: 'Mở lại hoạt động cho cửa hàng?', SUSPENDED: 'Tạm ngưng cửa hàng? Khách không truy cập được, nhân viên không đăng nhập được trang quản trị.', CLOSED: 'Đóng cửa hàng vĩnh viễn? (vẫn có thể mở lại)' }[status];
    if (await confirmDialog(STORE_STATUS[status].label, msg, 'Xác nhận', status !== 'ACTIVE')) patch({ status }, 'Đã đổi trạng thái');
  };
  const memberApi = async (path: string, method: string, json?: unknown, msg = 'Đã cập nhật') => {
    try { await api(`/super/stores/${id}/members${path}`, { method, json }); toast(msg); load(); return true; }
    catch (e: any) { toast(e.message, 'error'); return false; }
  };

  if (!s) return <Spinner />;
  const e = expiryInfo(s.planExpiresAt);
  const st = STORE_STATUS[s.status];
  const renewPlan = plans.find((p) => String(p.id) === renew?.planId);
  const grantPack = packs.find((p) => String(p.id) === grant?.packId);
  const revoke = async (p: StorePurchase) => {
    const note = await promptDialog({ title: p.status === 'PENDING' ? 'Huỷ đơn mua' : 'Thu hồi hạn mức', label: 'Lý do (gửi cho cửa hàng)', confirmText: 'Xác nhận', destructive: true });
    if (note === null) return;
    try { await api(`/super/purchases/${p.id}/cancel`, { method: 'POST', json: { note: note || undefined } }); toast('Đã cập nhật'); loadAddons(); } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="space-y-5">
      <Link href="/super/stores" className="btn-ghost btn-sm -ml-2 w-fit"><ArrowLeft className="h-4 w-4" /> Danh sách cửa hàng</Link>
      <div className="card flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{s.name}</h1><span className={`badge ${st.cls}`}>{st.label}</span></div>
          <div className="mt-1 text-sm text-slate-500">{storeUrl(s.slug).replace(/^https?:\/\//, '')} · Tạo ngày {date(s.createdAt)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={storeUrl(s.slug)} target="_blank" className="btn-outline btn-sm"><ExternalLink className="h-4 w-4" /> Xem cửa hàng</a>
          <button className="btn-primary btn-sm" onClick={() => { setActing({ id: s.id, slug: s.slug, name: s.name }); router.push('/admin'); }}><ShieldCheck className="h-4 w-4" /> Quản trị hộ</button>
          {s.status !== 'ACTIVE' && <button className="btn-outline btn-sm text-green-700" onClick={() => setStatus('ACTIVE')}><Play className="h-4 w-4" /> Kích hoạt</button>}
          {s.status === 'ACTIVE' && <button className="btn-outline btn-sm text-amber-700" onClick={() => setStatus('SUSPENDED')}><Pause className="h-4 w-4" /> Tạm ngưng</button>}
          {s.status !== 'CLOSED' && <button className="btn-outline btn-sm text-red-600" onClick={() => setStatus('CLOSED')}>Đóng</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<span className="font-bold">₫</span>} label="Doanh số tháng này" value={money(s.stats.monthRevenue)} hint={`${s.stats.monthOrders} đơn`} />
        <StatCard tone="sky" icon={<span className="font-bold">Σ</span>} label="Tổng doanh số" value={money(s.stats.revenue)} hint={`${num(s.stats.orders)} đơn (không tính huỷ)`} />
        <StatCard tone="violet" icon={<span className="font-bold">SP</span>} label="Sản phẩm / biến thể" value={`${s._count.products} / ${s.stats.variants}`} hint={addons?.limits.products.max != null ? `Giới hạn ${addons.limits.products.max}${addons.limits.products.extra ? ` (gồm ${addons.limits.products.extra} mua thêm)` : ''}` : 'Không giới hạn'} />
        <StatCard tone="accent" icon={<span className="font-bold">KH</span>} label="Khách đã mua online" value={num(s.stats.customers)} hint={`${s._count.members} tài khoản quản trị`} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">Thông tin đối tác</h2>
          <button className="btn-outline btn-sm" onClick={() => setPartner(partnerForm(s, toInputDate))}>Sửa thông tin đối tác</button>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {([
            ['Loại hình', s.businessType ? BUSINESS_TYPES[s.businessType] ?? s.businessType : null],
            ['Tên doanh nghiệp / HKD', s.businessName], ['Mã số thuế', s.taxCode],
            ['Địa chỉ đăng ký', s.businessAddress ? `${s.businessAddress}${s.businessAddressParts ? '' : ' (chưa có Tỉnh/Huyện/Xã)'}` : null],
            ['Địa chỉ cửa hàng', s.address ? `${s.address}${s.provinceCode != null ? '' : ' (chưa có Tỉnh/Huyện/Xã)'}` : null],
            ['Người đại diện', s.representative], ['CCCD', s.representativeId], ['SĐT người đại diện', s.representativePhone],
            ['Tài khoản đối soát', s.bankAccountNo ? `${s.bankAccountNo}${s.bankName ? ` · ${s.bankName}` : ''}` : null], ['Chủ tài khoản', s.bankAccountName],
            ['Số hợp đồng', s.contractNo], ['Ngày ký', s.contractSignedAt ? date(s.contractSignedAt) : null],
            ['Website riêng', storeUrl(s.slug).replace(/^https?:\/\//, '')],
          ] as [string, string | null | undefined][]).map(([k, v]) => (
            <div key={k} className="min-w-0"><dt className="text-slate-500">{k}</dt><dd className="truncate font-medium text-ink">{v || <span className="font-normal text-slate-300">Chưa có</span>}</dd></div>
          ))}
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">Gói dịch vụ</h2><button className="text-sm font-semibold text-violet-700" onClick={() => setManual({ planId: String(s.planId ?? ''), planExpiresAt: toInputDate(s.planExpiresAt) })}>Chỉnh tay</button></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-slate-500">Gói</div><div className="font-semibold">{s.plan?.name ?? '—'} {s.plan && <span className="font-normal text-slate-500">({s.plan.priceMonthly ? `${money(s.plan.priceMonthly)}/th` : 'miễn phí'})</span>}</div></div>
            <div><div className="text-slate-500">Hạn dùng</div><div className={e.cls}>{s.planExpiresAt ? `${date(s.planExpiresAt)} · ${e.text}` : e.text}</div></div>
            {LIMIT_KINDS.map((k) => {
              const l = addons?.limits[k];
              return (
                <div key={k}><div className="text-slate-500">{LIMIT_LABEL[k]}</div>
                  <div className="font-semibold">{addons ? `${addons.usage[k].toLocaleString('vi-VN')} / ${l?.max == null ? '∞' : l.max.toLocaleString('vi-VN')}` : '…'}{!!l?.extra && l.base != null && <span className="ml-1 text-xs font-normal text-violet-700">({l.base} + {l.extra} mua thêm)</span>}</div></div>
              );
            })}
          </div>
          <button className="btn-outline w-full" onClick={() => setGrant({ packId: String(packs.find((p) => p.isActive)?.id ?? ''), units: 1, amount: '', method: METHODS[0], ref: '', note: '' })}><PackagePlus className="h-4 w-4" /> Cấp gói mua thêm</button>
          <button className="btn-primary w-full" onClick={() => setRenew({ months: 1, planId: String(s.planId ?? plans[0]?.id ?? ''), amount: '', method: METHODS[0], note: '' })}><CalendarPlus className="h-4 w-4" /> Gia hạn / đổi gói</button>
        </div>
        <form className="card space-y-3" onSubmit={(ev) => { ev.preventDefault(); patch({ ...info, addressParts: toPayload(addr) }, 'Đã lưu thông tin'); }}>
          <h2 className="font-bold">Thông tin cửa hàng</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Tên</label><input className="input" value={info.name} onChange={(ev) => setInfo({ ...info, name: ev.target.value })} /></div>
            <div><label className="label">Slug</label><input className="input" value={info.slug} onChange={(ev) => setInfo({ ...info, slug: ev.target.value })} /></div>
            <div><label className="label">SĐT</label><input className="input" value={info.phone} onChange={(ev) => setInfo({ ...info, phone: ev.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={info.email} onChange={(ev) => setInfo({ ...info, email: ev.target.value })} /></div>
          </div>
          <AddressFields label="Địa chỉ cửa hàng (điểm tài xế lấy hàng)" testId="store-addr" value={addr} onChange={setAddr}
            hint={s.provinceCode == null && s.address ? `Địa chỉ cũ (chưa có Tỉnh/Huyện/Xã): ${s.address}` : undefined} />
          <div><label className="label">Ghi chú nội bộ</label><textarea className="input" rows={2} value={info.note} onChange={(ev) => setInfo({ ...info, note: ev.target.value })} /></div>
          <div className="flex justify-end"><button className="btn-primary">Lưu thông tin</button></div>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="flex items-center justify-between p-5 pb-2"><h2 className="font-bold">Tài khoản quản trị cửa hàng</h2><button className="btn-outline btn-sm" onClick={() => setMember({ email: '', password: '', fullName: '', phone: '', role: 'STAFF' })}><Plus className="h-4 w-4" /> Thêm</button></div>
        <table className="table">
          <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead>
          <tbody>
            {s.members.map((u) => (
              <tr key={u.id}>
                <td><div className="font-medium">{u.fullName}</div><div className="text-xs text-slate-500">{u.email}{u.phone && ` · ${u.phone}`}</div></td>
                <td>
                  <select className="input w-36 py-1" value={u.role} onChange={(ev) => memberApi(`/${u.id}`, 'PATCH', { role: ev.target.value })}>
                    <option value="ADMIN">{ROLES.ADMIN}</option><option value="STAFF">{ROLES.STAFF}</option>
                  </select>
                </td>
                <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Hoạt động' : 'Đã khoá'}</span></td>
                <td className="text-xs">{date(u.createdAt)}</td>
                <td className="space-x-1 text-right whitespace-nowrap">
                  <button className="btn-outline btn-sm" title="Đặt lại mật khẩu" onClick={() => setPwd({ u, value: '' })}><KeyRound className="h-3.5 w-3.5" /></button>
                  <button className="btn-outline btn-sm" onClick={() => memberApi(`/${u.id}`, 'PATCH', { isActive: !u.isActive })}>{u.isActive ? 'Khoá' : 'Mở khoá'}</button>
                  <button className="btn-danger btn-sm" title="Gỡ khỏi cửa hàng" onClick={async () => { if (await confirmDialog(`Gỡ ${u.fullName} khỏi cửa hàng?`, 'Tài khoản sẽ mất quyền quản trị cửa hàng.', 'Gỡ thành viên', true)) memberApi(`/${u.id}`, 'DELETE', undefined, 'Đã gỡ'); }}><UserMinus className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-bold">Gói mua thêm & đơn mua</h2>
        <table className="table">
          <thead><tr><th>Ngày</th><th>Mã</th><th>Nội dung</th><th>Hiệu lực</th><th className="text-right">Số tiền</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {addons?.purchases.length ? addons.purchases.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{date(p.createdAt)}</td><td className="font-mono text-xs">{p.code}</td>
                <td>{p.name}<div className="text-xs text-slate-500">{p.type === 'ADDON' && p.kind ? `+${p.quantity.toLocaleString('vi-VN')} ${LIMIT_UNIT[p.kind]} · ` : ''}{PURCHASE_SOURCE[p.source]}{p.note ? ` · ${p.note}` : ''}</div></td>
                <td className="text-xs">{p.status === 'ACTIVE' ? (p.expiresAt ? `đến ${date(p.expiresAt)}${isLive(p) ? '' : ' (hết)'}` : 'Không thời hạn') : '—'}</td>
                <td className="text-right font-semibold">{money(p.amount)}</td>
                <td><span className={`badge ${PURCHASE_STATUS[p.status].cls}`}>{PURCHASE_STATUS[p.status].label}</span></td>
                <td className="text-right">{(p.status === 'PENDING' || (p.type === 'ADDON' && isLive(p))) && <button className="btn-ghost btn-sm text-red-600" title={p.status === 'PENDING' ? 'Huỷ' : 'Thu hồi'} onClick={() => revoke(p)}><XCircle className="h-4 w-4" /></button>}</td>
              </tr>
            )) : <tr><td colSpan={7} className="text-center text-slate-400">Chưa có gói mua thêm</td></tr>}
          </tbody>
        </table>
        {addons?.purchases.some((p) => p.status === 'PENDING') && <p className="px-5 pb-4 text-sm text-amber-700">Có đơn chờ thanh toán – xác nhận tại <Link href="/super/addons" className="link">Gói mua thêm & đơn mua</Link>.</p>}
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-bold">Lịch sử thu phí</h2>
        <table className="table">
          <thead><tr><th>Ngày thu</th><th>Gói</th><th>Tháng</th><th>Thời hạn</th><th className="text-right">Số tiền</th><th>Hình thức</th><th>Người thu</th></tr></thead>
          <tbody>
            {s.payments.length ? s.payments.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{date(p.createdAt)}</td><td>{p.plan?.name ?? '—'}</td><td>{p.months}</td>
                <td className="text-xs">{date(p.periodFrom)} → {date(p.periodTo)}</td><td className="text-right font-semibold">{money(p.amount)}</td>
                <td>{p.method || '—'}{p.note && <div className="text-xs text-slate-400">{p.note}</div>}</td><td className="text-xs">{p.createdBy?.fullName ?? '—'}</td>
              </tr>
            )) : <tr><td colSpan={7} className="text-center text-slate-400">Chưa có phiếu thu</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!renew} onClose={() => setRenew(null)} title="Gia hạn gói dịch vụ">
        {renew && (
          <form className="space-y-3" onSubmit={async (ev) => {
            ev.preventDefault();
            try {
              apply(await api<Detail>(`/super/stores/${id}/renew`, { method: 'POST', json: { months: renew.months, planId: renew.planId ? Number(renew.planId) : undefined, amount: renew.amount === '' ? undefined : Number(renew.amount), method: renew.method, note: renew.note || undefined } }));
              toast('Đã gia hạn & ghi phiếu thu'); setRenew(null);
            } catch (err: any) { toast(err.message, 'error'); }
          }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Gói</label><select className="input" value={renew.planId} onChange={(ev) => setRenew({ ...renew, planId: ev.target.value })}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label">Số tháng</label><select className="input" value={renew.months} onChange={(ev) => setRenew({ ...renew, months: Number(ev.target.value) })}>{[1, 2, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} tháng</option>)}</select></div>
              <div><label className="label">Số tiền (₫)</label><input className="input" type="number" min={0} placeholder={String((renewPlan?.priceMonthly ?? 0) * renew.months)} value={renew.amount} onChange={(ev) => setRenew({ ...renew, amount: ev.target.value })} /></div>
              <div><label className="label">Hình thức</label><select className="input" value={renew.method} onChange={(ev) => setRenew({ ...renew, method: ev.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
            </div>
            <div><label className="label">Ghi chú</label><input className="input" value={renew.note} onChange={(ev) => setRenew({ ...renew, note: ev.target.value })} /></div>
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Thời hạn được cộng thêm từ {s.planExpiresAt && new Date(s.planExpiresAt) > new Date() ? `ngày hết hạn hiện tại (${date(s.planExpiresAt)})` : 'hôm nay'}. Thành tiền: <b>{money(renew.amount === '' ? (renewPlan?.priceMonthly ?? 0) * renew.months : Number(renew.amount))}</b></p>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setRenew(null)}>Huỷ</button><button className="btn-primary">Xác nhận gia hạn</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!grant} onClose={() => setGrant(null)} title="Cấp gói mua thêm cho cửa hàng">
        {grant && (
          <form className="space-y-3" onSubmit={async (ev) => {
            ev.preventDefault();
            try {
              setAddons(await api(`/super/stores/${id}/addons`, { method: 'POST', json: { packId: Number(grant.packId), units: grant.units, amount: grant.amount === '' ? undefined : Number(grant.amount), method: grant.method, ref: grant.ref || undefined, note: grant.note || undefined } }));
              toast('Đã cấp & kích hoạt'); setGrant(null); load();
            } catch (err: any) { toast(err.message, 'error'); }
          }}>
            <div><label className="label">Gói mua thêm</label><select className="input" required value={grant.packId} onChange={(ev) => setGrant({ ...grant, packId: ev.target.value })}>
              {packs.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)} · {packDuration(p.months)}{p.isActive ? '' : ' (ngừng bán)'}</option>)}</select></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label">Số lượng</label><input className="input" type="number" min={1} max={20} value={grant.units} onChange={(ev) => setGrant({ ...grant, units: Math.max(1, Math.min(20, Number(ev.target.value) || 1)) })} /></div>
              <div><label className="label">Số tiền (₫)</label><input className="input" type="number" min={0} placeholder={String((grantPack?.price ?? 0) * grant.units)} value={grant.amount} onChange={(ev) => setGrant({ ...grant, amount: ev.target.value })} /></div>
              <div><label className="label">Hình thức</label><select className="input" value={grant.method} onChange={(ev) => setGrant({ ...grant, method: ev.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Mã giao dịch</label><input className="input font-mono" value={grant.ref} onChange={(ev) => setGrant({ ...grant, ref: ev.target.value })} /></div>
              <div><label className="label">Ghi chú</label><input className="input" placeholder="VD: tặng khi gia hạn 12 tháng" value={grant.note} onChange={(ev) => setGrant({ ...grant, note: ev.target.value })} /></div>
            </div>
            {grantPack && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Cộng ngay <b>+{(grantPack.quantity * grant.units).toLocaleString('vi-VN')} {LIMIT_UNIT[grantPack.kind]}</b>, hiệu lực {packDuration(grantPack.months)}. Thành tiền <b>{money(grant.amount === '' ? grantPack.price * grant.units : Number(grant.amount))}</b> (nhập 0 nếu tặng – không ghi phiếu thu).</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setGrant(null)}>Huỷ</button><button className="btn-primary">Cấp gói</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!manual} onClose={() => setManual(null)} title="Chỉnh gói & hạn dùng (không ghi phiếu thu)">
        {manual && (
          <form className="space-y-3" onSubmit={async (ev) => { ev.preventDefault(); if (await patch({ planId: manual.planId ? Number(manual.planId) : null, planExpiresAt: manual.planExpiresAt ? new Date(`${manual.planExpiresAt}T23:59:59`).toISOString() : null })) setManual(null); }}>
            <div><label className="label">Gói</label><select className="input" value={manual.planId} onChange={(ev) => setManual({ ...manual, planId: ev.target.value })}><option value="">— Không gán —</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label">Hết hạn ngày (để trống = không thời hạn)</label><input className="input" type="date" value={manual.planExpiresAt} onChange={(ev) => setManual({ ...manual, planExpiresAt: ev.target.value })} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setManual(null)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!member} onClose={() => setMember(null)} title="Thêm tài khoản cho cửa hàng">
        {member && (
          <form className="space-y-3" onSubmit={async (ev) => { ev.preventDefault(); if (await memberApi('', 'POST', { ...member, phone: member.phone || undefined }, 'Đã thêm tài khoản')) setMember(null); }}>
            <div><label className="label">Họ tên *</label><input className="input" required minLength={2} value={member.fullName} onChange={(ev) => setMember({ ...member, fullName: ev.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Email *</label><input className="input" type="email" required value={member.email} onChange={(ev) => setMember({ ...member, email: ev.target.value })} /></div>
              <div><label className="label">Mật khẩu *</label><input className="input" required minLength={6} value={member.password} onChange={(ev) => setMember({ ...member, password: ev.target.value })} /></div>
              <div><label className="label">SĐT</label><input className="input" value={member.phone} onChange={(ev) => setMember({ ...member, phone: ev.target.value })} /></div>
              <div><label className="label">Vai trò</label><select className="input" value={member.role} onChange={(ev) => setMember({ ...member, role: ev.target.value as 'STAFF' })}><option value="STAFF">{ROLES.STAFF}</option><option value="ADMIN">{ROLES.ADMIN}</option></select></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setMember(null)}>Huỷ</button><button className="btn-primary">Thêm</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!partner} onClose={() => setPartner(null)} title="Thông tin đối tác" size="lg">
        {partner && (
          <form className="space-y-4" onSubmit={async (ev) => { ev.preventDefault(); if (await patch(partnerPayload(partner), 'Đã lưu thông tin đối tác')) setPartner(null); }}>
            <PartnerFields value={partner} onChange={setPartner} legacyAddress={s.businessAddressParts ? null : s.businessAddress} />
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setPartner(null)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pwd} onClose={() => setPwd(null)} title={`Đặt lại mật khẩu – ${pwd?.u.email ?? ''}`}>
        {pwd && (
          <form className="space-y-3" onSubmit={async (ev) => { ev.preventDefault(); if (await memberApi(`/${pwd.u.id}`, 'PATCH', { password: pwd.value }, 'Đã đặt lại mật khẩu')) setPwd(null); }}>
            <div><label className="label">Mật khẩu mới</label><input className="input" required minLength={6} value={pwd.value} onChange={(ev) => setPwd({ ...pwd, value: ev.target.value })} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setPwd(null)}>Huỷ</button><button className="btn-primary">Lưu</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
