'use client';
import { Plus, Search, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Pagination, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { ROOT_DOMAIN } from '@/lib/platform';
import { money } from '@/lib/format';
import { PartnerFields, partnerPayload } from '@/components/super/PartnerFields';
import { EMPTY_PARTNER, expiryInfo, METHODS, slugifyVi, STORE_STATUS, type SuperStore } from '@/lib/super';
import type { Paged, Plan } from '@/lib/types';

const EMPTY = {
  name: '', slug: '', phone: '', email: '', address: '', note: '', planId: '', months: 1, amount: '', method: METHODS[0],
  owner: { fullName: '', email: '', password: '', phone: '' },
};

function CreateStore({ plans, onClose, onDone }: { plans: Plan[]; onClose: () => void; onDone: (s: SuperStore) => void }) {
  const toast = useToast();
  const [f, setF] = useState({ ...EMPTY, planId: String(plans.find((p) => p.isActive)?.id ?? '') });
  const [partner, setPartner] = useState(EMPTY_PARTNER);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const plan = plans.find((p) => String(p.id) === f.planId);
  const autoAmount = (plan?.priceMonthly ?? 0) * Number(f.months || 0);
  const slug = slugTouched ? f.slug : slugifyVi(f.name);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const s = await api<SuperStore>('/super/stores', {
        method: 'POST',
        json: {
          name: f.name, slug, phone: f.phone || undefined, email: f.email || undefined, address: f.address || undefined, note: f.note || undefined,
          planId: f.planId ? Number(f.planId) : undefined, months: Number(f.months), amount: f.amount === '' ? undefined : Number(f.amount), method: f.method,
          owner: { ...f.owner, phone: f.owner.phone || undefined },
          ...partnerPayload(partner),
        },
      });
      toast('Đã tạo cửa hàng & tài khoản chủ cửa hàng');
      onDone(s);
    } catch (err: any) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-ink">1. Thông tin đối tác (pháp lý, đối soát, hợp đồng)</legend>
        <PartnerFields value={partner} onChange={setPartner} />
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-ink">2. Cửa hàng</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Tên cửa hàng *</label><input className="input" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div>
            <label className="label">{ROOT_DOMAIN ? 'Subdomain riêng *' : 'Đường dẫn (slug) *'}</label>
            <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-brand-500"><span className="pl-3 text-sm text-slate-400">{ROOT_DOMAIN ? '' : '/s/'}</span>
              <input className="w-full min-w-0 rounded-xl bg-transparent px-1 py-2.5 text-sm outline-none" required pattern="[a-z0-9-]{3,}" title="a-z, 0-9, dấu gạch ngang, tối thiểu 3 ký tự" value={slug} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: slugifyVi(e.target.value) || e.target.value.toLowerCase() }); }} />
              {ROOT_DOMAIN && <span className="pr-3 text-sm whitespace-nowrap text-slate-400">.{ROOT_DOMAIN}</span>}
            </div>
          </div>
          <div><label className="label">Số điện thoại</label><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label className="label">Email liên hệ</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div><label className="label">Địa chỉ</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-ink">3. Tài khoản quản lý cửa hàng (chủ đối tác đăng nhập)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Họ tên *</label><input className="input" required minLength={2} value={f.owner.fullName} onChange={(e) => setF({ ...f, owner: { ...f.owner, fullName: e.target.value } })} /></div>
          <div><label className="label">Email đăng nhập *</label><input className="input" type="email" required value={f.owner.email} onChange={(e) => setF({ ...f, owner: { ...f.owner, email: e.target.value } })} /></div>
          <div><label className="label">Mật khẩu *</label><input className="input" required minLength={6} value={f.owner.password} onChange={(e) => setF({ ...f, owner: { ...f.owner, password: e.target.value } })} placeholder="Tối thiểu 6 ký tự" /></div>
          <div><label className="label">SĐT chủ cửa hàng</label><input className="input" value={f.owner.phone} onChange={(e) => setF({ ...f, owner: { ...f.owner, phone: e.target.value } })} /></div>
        </div>
        <p className="text-xs text-slate-500">Nếu email đã là tài khoản khách hàng, tài khoản đó sẽ được nâng thành chủ cửa hàng (mật khẩu được đặt lại theo ô trên).</p>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-ink">4. Gói dịch vụ & thanh toán</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Gói</label>
            <select className="input" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>
              <option value="">— Không gán gói —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.priceMonthly ? `${money(p.priceMonthly)}/tháng` : 'Miễn phí'}{!p.isActive ? ' (ngừng bán)' : ''}</option>)}
            </select>
          </div>
          <div><label className="label">Thời hạn</label>
            <select className="input" value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })}>
              {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} tháng</option>)}
              <option value={0}>Không thời hạn</option>
            </select>
          </div>
          {Number(f.months) > 0 && (
            <>
              <div><label className="label">Số tiền thu (₫)</label><input className="input" type="number" min={0} value={f.amount} placeholder={String(autoAmount)} onChange={(e) => setF({ ...f, amount: e.target.value })} /><p className="mt-1 text-xs text-slate-400">Để trống = {money(autoAmount)}</p></div>
              <div><label className="label">Hình thức</label><select className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
            </>
          )}
        </div>
        <div><label className="label">Ghi chú nội bộ</label><textarea className="input" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      </fieldset>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Huỷ</button><button className="btn-primary" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo đối tác'}</button></div>
    </form>
  );
}

function StoresInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState({ search: '', status: '', planId: '', expiry: sp.get('expiry') ?? '', page: 1 });
  const [data, setData] = useState<Paged<SuperStore> | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creating, setCreating] = useState(sp.get('new') === '1');

  useEffect(() => { api<Plan[]>('/super/plans').then(setPlans); }, []);
  useEffect(() => { setData(null); api<Paged<SuperStore>>('/super/stores' + qs({ ...filter, limit: 20 })).then(setData); }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Đối tác / cửa hàng</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Thêm đối tác</button>
      </div>
      <div className="card flex flex-wrap gap-3 p-4">
        <form className="relative w-full sm:w-72" onSubmit={(e) => { e.preventDefault(); setFilter({ ...filter, search: String(new FormData(e.currentTarget).get('q') ?? ''), page: 1 }); }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" className="input pl-9" placeholder="Tên, slug, SĐT, email, MST, người đại diện…" />
        </form>
        <select className="input w-full sm:w-44" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STORE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input w-full sm:w-44" value={filter.planId} onChange={(e) => setFilter({ ...filter, planId: e.target.value, page: 1 })}>
          <option value="">Mọi gói</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input w-full sm:w-44" value={filter.expiry} onChange={(e) => setFilter({ ...filter, expiry: e.target.value, page: 1 })}>
          <option value="">Mọi hạn dùng</option>
          <option value="soon">Sắp hết hạn (≤7 ngày)</option>
          <option value="expired">Đã hết hạn</option>
        </select>
      </div>
      <div className="card overflow-x-auto p-0">
        {!data ? <Spinner /> : !data.items.length ? <Empty icon={<Store className="h-7 w-7" />} text="Không có cửa hàng phù hợp" /> : (
          <table className="table">
            <thead><tr><th>Cửa hàng / đối tác</th><th>Tài khoản chủ</th><th>Gói</th><th>Hạn dùng</th><th className="text-right">SP / Đơn / TK</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {data.items.map((s) => {
                const e = expiryInfo(s.planExpiresAt);
                return (
                  <tr key={s.id} className="cursor-pointer" onClick={() => router.push(`/super/stores/${s.id}`)}>
                    <td><Link href={`/super/stores/${s.id}`} className="font-semibold text-ink hover:text-violet-700">{s.name}</Link><div className="text-xs text-slate-400">/s/{s.slug}{s.phone && ` · ${s.phone}`}</div>{s.businessName && <div className="text-xs text-slate-500">{s.businessName}</div>}</td>
                    <td>{s.owner ? <><div className="text-sm">{s.owner.fullName}</div><div className="text-xs text-slate-400">{s.owner.email}</div></> : <span className="text-slate-400">—</span>}</td>
                    <td>{s.plan?.name ?? <span className="text-slate-400">—</span>}</td>
                    <td className={`text-sm ${e.cls}`}>{e.text}</td>
                    <td className="text-right text-sm">{s._count.products} / {s._count.orders} / {s._count.members}</td>
                    <td><span className={`badge ${STORE_STATUS[s.status].cls}`}>{STORE_STATUS[s.status].label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilter({ ...filter, page })} />}
      <Modal open={creating} onClose={() => setCreating(false)} title="Thêm đối tác mới" size="lg">
        {creating && <CreateStore plans={plans} onClose={() => setCreating(false)} onDone={(s) => router.push(`/super/stores/${s.id}`)} />}
      </Modal>
    </div>
  );
}

export default function SuperStoresPage() {
  return <Suspense fallback={<Spinner />}><StoresInner /></Suspense>;
}
