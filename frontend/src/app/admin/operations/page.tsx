'use client';

import { useEffect, useState } from 'react';
import { BadgeDollarSign, Gift, History, Lock, Megaphone, Plus, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Empty, Modal, Spinner } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { useAuth } from '@/context/auth';

type Tab = 'returns' | 'reconcile' | 'loyalty' | 'promotions' | 'crm' | 'audit';
type Customer = { id: number; email: string; fullName?: string | null; phone?: string | null; orders?: number; totalSpent?: number };

const TABS: { id: Tab; label: string; icon: typeof RotateCcw }[] = [
  { id: 'returns', label: 'Đổi trả & khiếu nại', icon: RotateCcw },
  { id: 'reconcile', label: 'Đối soát', icon: BadgeDollarSign },
  { id: 'loyalty', label: 'Thành viên', icon: Gift },
  { id: 'promotions', label: 'Khuyến mãi', icon: Megaphone },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'audit', label: 'Audit log', icon: ShieldCheck },
];
const TAB_FEATURE: Record<Tab, string> = { returns: 'RETURNS', reconcile: 'RECONCILIATION', loyalty: 'LOYALTY', promotions: 'ADVANCED_PROMOTIONS', crm: 'CRM', audit: 'AUDIT_LOG' };

const STATUS: Record<string, string> = {
  REQUESTED: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', RECEIVED: 'Đã nhận hàng',
  REFUNDED: 'Đã hoàn tiền', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã huỷ', DRAFT: 'Nháp',
  CONFIRMED: 'Đã chốt', SENT: 'Đã gửi',
};

function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="text-lg font-bold text-slate-900">{title}</h2>{description && <p className="text-sm text-slate-500">{description}</p>}</div>
    {action}
  </div>;
}

function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (customer: Customer) => void }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api<{ items: Customer[] }>(`/admin/customers${qs({ search, limit: 50 })}`);
        setItems(result.items);
      } catch (error: any) { toast(error.message, 'error'); }
      finally { setLoading(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, toast]);

  return <div className="space-y-2">
    <label className="label">Khách hàng của cửa hàng</label>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email hoặc số điện thoại" /></div>
    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
      {loading ? <Spinner /> : !items.length ? <Empty text="Không tìm thấy khách hàng" /> : items.map((customer) => {
        const selected = value?.id === customer.id;
        return <button type="button" key={customer.id} onClick={() => onChange(customer)} className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 ${selected ? 'bg-brand-50 ring-1 ring-inset ring-brand-500' : 'hover:bg-slate-50'}`}>
          <div className="min-w-0"><div className="truncate font-semibold">{customer.fullName || customer.email}</div><div className="truncate text-xs text-slate-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</div></div>
          <div className="shrink-0 text-right text-xs text-slate-500"><div>{customer.orders ?? 0} đơn</div><div>{money(customer.totalSpent ?? 0)}</div></div>
        </button>;
      })}
    </div>
    {value && <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Đã chọn: <b>{value.fullName || value.email}</b></div>}
  </div>;
}

export default function OperationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('returns');
  const features = user?.store?.plan?.features ?? [];
  const allowed = user?.role === 'SUPER_ADMIN' || features.includes(TAB_FEATURE[tab]);
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Vận hành & tăng trưởng</h1><p className="text-sm text-slate-500">Hậu mãi, tài chính, khách hàng thân thiết, khuyến mãi và marketing trên cùng một nơi.</p></div>
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-soft">{TABS.map((item) => { const unlocked = user?.role === 'SUPER_ADMIN' || features.includes(TAB_FEATURE[item.id]); return <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${tab === item.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'} ${unlocked ? '' : 'opacity-60'}`}><item.icon className="h-4 w-4" />{item.label}{!unlocked && <Lock className="h-3.5 w-3.5" />}</button>; })}</div>
    {!allowed ? <div className="card flex flex-col items-center py-14 text-center"><span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Lock className="h-6 w-6" /></span><h2 className="text-lg font-bold">Tính năng chưa có trong gói hiện tại</h2><p className="mt-1 max-w-lg text-sm text-slate-500">Nâng cấp gói dịch vụ để sử dụng tính năng này. Dữ liệu hiện có vẫn được giữ nguyên.</p><Link href="/admin/subscription" className="btn-primary mt-4">Xem và nâng cấp gói</Link></div> : <>{tab === 'returns' && <Returns />}{tab === 'reconcile' && <Reconciliations />}{tab === 'loyalty' && <Loyalty />}{tab === 'promotions' && <Promotions />}{tab === 'crm' && <Crm />}{tab === 'audit' && <Audit />}</>}
  </div>;
}

function Returns() {
  const toast = useToast(); const [data, setData] = useState<any>(null); const [status, setStatus] = useState('');
  const load = () => api<any>(`/admin/operations/returns${qs({ limit: 100, status })}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const next: Record<string, string[]> = { REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED', 'CANCELLED'], RECEIVED: ['REFUNDED', 'COMPLETED'], REFUNDED: ['COMPLETED'] };
  const advance = async (request: any, newStatus: string) => {
    if (!(await confirmDialog(`${STATUS[newStatus] ?? newStatus} yêu cầu ${request.code}?`, newStatus === 'RECEIVED' ? 'Tồn kho các sản phẩm được trả sẽ tăng ngay.' : newStatus === 'REFUNDED' ? `Hệ thống sẽ ghi nhận hoàn ${money(request.approvedAmount ?? request.requestedAmount)}.` : '', STATUS[newStatus] ?? newStatus, ['REJECTED', 'CANCELLED'].includes(newStatus)))) return;
    try { await api(`/admin/operations/returns/${request.id}`, { method: 'PATCH', json: { status: newStatus, approvedAmount: request.approvedAmount ?? request.requestedAmount } }); toast('Đã cập nhật yêu cầu'); load(); } catch (error: any) { toast(error.message, 'error'); }
  };
  return <div className="space-y-4">
    <SectionTitle title="Đổi trả, hoàn tiền & khiếu nại" description="Các yêu cầu do khách hàng gửi từ đơn hàng của họ." />
    <div className="card flex items-end gap-3 p-4"><div><label className="label">Trạng thái</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(STATUS).slice(0, 7).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" />Làm mới</button></div>
    <div className="card overflow-x-auto p-0">{!data ? <Spinner /> : !data.items.length ? <Empty text="Chưa có yêu cầu hậu mãi" /> : <table className="table"><thead><tr><th>Yêu cầu</th><th>Loại/Lý do</th><th>Giá trị</th><th>Trạng thái</th><th>Thời gian</th><th /></tr></thead><tbody>{data.items.map((request: any) => <tr key={request.id}><td><b>{request.code}</b><div className="text-xs text-slate-400">Đơn #{request.orderId} · KH #{request.userId}</div></td><td>{request.type}<div className="max-w-xs text-xs text-slate-500">{request.reason}{request.customerNote && ` · ${request.customerNote}`}</div></td><td>{money(request.approvedAmount ?? request.requestedAmount)}</td><td><span className="badge bg-slate-100 text-slate-700">{STATUS[request.status] ?? request.status}</span></td><td className="text-xs">{dateTime(request.createdAt)}</td><td><div className="flex flex-wrap justify-end gap-1">{(next[request.status] ?? []).map((item) => <button key={item} className={['REJECTED', 'CANCELLED'].includes(item) ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => advance(request, item)}>{STATUS[item]}</button>)}</div></td></tr>)}</tbody></table>}</div>
  </div>;
}

function Reconciliations() {
  const toast = useToast(); const today = new Date().toISOString().slice(0, 10);
  const initial = { type: 'COD', periodFrom: today, periodTo: today, actualAmount: '', note: '' };
  const [list, setList] = useState<any[] | null>(null); const [open, setOpen] = useState(false); const [form, setForm] = useState(initial); const [preview, setPreview] = useState<any>(null);
  const load = () => api<any[]>('/admin/operations/reconciliations').then(setList); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setOpen(false); setPreview(null); setForm(initial); };
  const calculate = async () => { try { setPreview(await api('/admin/operations/reconciliations/preview', { method: 'POST', json: { ...form, actualAmount: form.actualAmount === '' ? undefined : Number(form.actualAmount) } })); } catch (error: any) { toast(error.message, 'error'); } };
  const save = async () => { try { await api('/admin/operations/reconciliations', { method: 'POST', json: { ...form, actualAmount: form.actualAmount === '' ? preview?.expectedAmount : Number(form.actualAmount) } }); toast('Đã tạo phiên đối soát'); close(); load(); } catch (error: any) { toast(error.message, 'error'); } };
  return <div className="space-y-4">
    <SectionTitle title="Đối soát COD & thanh toán" description="Theo dõi số liệu hệ thống và số tiền thực nhận." action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Tạo phiên đối soát</button>} />
    <div className="card overflow-x-auto p-0">{!list ? <Spinner /> : !list.length ? <Empty text="Chưa có phiên đối soát" /> : <table className="table"><thead><tr><th>Mã</th><th>Loại</th><th>Kỳ</th><th>Hệ thống</th><th>Thực nhận</th><th>Chênh lệch</th><th>Trạng thái</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td className="font-mono font-bold">{item.code}</td><td>{item.type}</td><td className="text-xs">{new Date(item.periodFrom).toLocaleDateString('vi-VN')} – {new Date(item.periodTo).toLocaleDateString('vi-VN')}</td><td>{money(item.expectedAmount)}</td><td>{money(item.actualAmount)}</td><td className={item.difference ? 'font-bold text-red-600' : 'text-green-700'}>{money(item.difference)}</td><td>{STATUS[item.status] ?? item.status}</td></tr>)}</tbody></table>}</div>
    <Modal open={open} onClose={close} title="Tạo phiên đối soát" size="lg"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Loại</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="COD">COD tài xế</option><option value="PAYMENT">Thanh toán</option></select></div><div><label className="label">Số tiền thực nhận</label><input type="number" className="input" value={form.actualAmount} onChange={(e) => setForm({ ...form, actualAmount: e.target.value })} placeholder="Để trống nếu bằng hệ thống" /></div><div><label className="label">Từ ngày</label><input type="date" className="input" value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} /></div><div><label className="label">Đến ngày</label><input type="date" className="input" value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} /></div><div className="md:col-span-2"><label className="label">Ghi chú</label><textarea className="input" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>{preview && <div className="rounded-xl bg-brand-50 p-4 md:col-span-2"><b>Hệ thống: {money(preview.expectedAmount)}</b> · {preview.itemCount} giao dịch{form.type === 'COD' && <p className="mt-1 text-xs text-slate-600">Số tiền tài xế phải nộp lại cửa hàng = tiền thu hộ của khách − phí ship tài xế đã giữ.</p>}</div>}<div className="flex justify-end gap-2 md:col-span-2"><button className="btn-outline" onClick={close}>Huỷ</button><button className="btn-outline" onClick={calculate}>Tính đối soát</button><button className="btn-primary" disabled={!preview} onClick={save}>Lưu phiên</button></div></div></Modal>
  </div>;
}

function Loyalty() {
  const toast = useToast();
  const [view, setView] = useState<'members' | 'tiers'>('members');
  const [list, setList] = useState<any[] | null>(null); const [tiers, setTiers] = useState<any[] | null>(null); const [coupons, setCoupons] = useState<any[]>([]);
  const [open, setOpen] = useState(false); const [tierOpen, setTierOpen] = useState(false); const [customer, setCustomer] = useState<Customer | null>(null); const [points, setPoints] = useState(''); const [note, setNote] = useState('');
  const [tier, setTier] = useState<any>(null); const [benefit, setBenefit] = useState('');
  const load = () => Promise.all([api<any[]>('/admin/operations/loyalty'), api<any[]>('/admin/operations/loyalty/tiers'), api<any[]>('/admin/coupons')]).then(([members, settings, couponList]) => { setList(members); setTiers(settings); setCoupons(couponList); }); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setOpen(false); setCustomer(null); setPoints(''); setNote(''); };
  const adjust = async () => { if (!customer) return; try { await api('/admin/operations/loyalty/adjust', { method: 'POST', json: { userId: customer.id, points: Number(points), note } }); toast('Đã điều chỉnh điểm'); close(); load(); } catch (error: any) { toast(error.message, 'error'); } };
  const editTier = (item: any) => { setTier({ ...item, benefits: Array.isArray(item.benefits) ? item.benefits : [] }); setBenefit(''); setTierOpen(true); };
  const saveTier = async () => { try { await api(`/admin/operations/loyalty/tiers/${tier.key}`, { method: 'PUT', json: { key: tier.key, name: tier.name, minSpend: Number(tier.minSpend), benefits: tier.benefits, rewardCouponCode: tier.rewardCouponCode || undefined, sortOrder: tier.sortOrder, isActive: tier.isActive } }); toast('Đã lưu cấu hình hạng'); setTierOpen(false); load(); } catch (error: any) { toast(error.message, 'error'); } };
  return <div className="space-y-4">
    <SectionTitle title="Tích điểm & hạng thành viên" description="Quản lý thành viên và điều kiện lên hạng riêng của cửa hàng." action={view === 'members' ? <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Điều chỉnh điểm</button> : undefined} />
    <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1"><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'members' ? 'bg-white shadow text-brand-700' : 'text-slate-600'}`} onClick={() => setView('members')}>Danh sách thành viên</button><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'tiers' ? 'bg-white shadow text-brand-700' : 'text-slate-600'}`} onClick={() => setView('tiers')}>Cấu hình hạng</button></div>
    {view === 'members' ? <div className="card overflow-x-auto p-0">{!list ? <Spinner /> : !list.length ? <Empty text="Chưa có thành viên" /> : <table className="table"><thead><tr><th>Khách hàng</th><th>Hạng</th><th>Chi tiêu</th><th>Điểm dùng được</th><th>Điểm trọn đời</th><th>Tham gia</th></tr></thead><tbody>{list.map((item) => <tr key={item.id}><td><b>{item.user?.fullName || item.user?.email || `#${item.userId}`}</b><div className="text-xs text-slate-500">{item.user?.email}</div></td><td><b>{tiers?.find((x) => x.key === item.tier)?.name || item.tier}</b></td><td>{money(item.totalSpent)}</td><td>{item.points.toLocaleString('vi-VN')}</td><td>{item.lifetimePoints.toLocaleString('vi-VN')}</td><td>{new Date(item.joinedAt).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table>}</div> : <div className="grid gap-4 md:grid-cols-2">{!tiers ? <Spinner /> : tiers.map((item) => <div className="card" key={item.key}><div className="flex items-start justify-between"><div><span className="text-xs font-bold uppercase text-slate-400">{item.key}</span><h3 className="text-xl font-bold">Hạng {item.name}</h3></div><button className="btn-outline btn-sm" onClick={() => editTier(item)}>Tuỳ chỉnh</button></div><div className="mt-4 text-sm"><span className="text-slate-500">Lên hạng khi chi tiêu từ</span><div className="text-lg font-bold text-brand-700">{money(item.minSpend)}</div></div><div className="mt-3 flex flex-wrap gap-2">{item.benefits?.length ? item.benefits.map((text: string) => <span key={text} className="badge bg-green-50 text-green-700">{text}</span>) : <span className="text-sm text-slate-400">Chưa cấu hình ưu đãi</span>}</div>{item.rewardCouponCode && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Tặng mã: <b>{item.rewardCouponCode}</b></div>}</div>)}</div>}
    <Modal open={open} onClose={close} title="Điều chỉnh điểm thành viên" size="lg"><div className="space-y-4"><CustomerPicker value={customer} onChange={setCustomer} /><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Điểm (+/-)</label><input className="input" type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Ví dụ: 100 hoặc -50" /></div><div><label className="label">Lý do</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do điều chỉnh" /></div></div><div className="flex justify-end gap-2"><button className="btn-outline" onClick={close}>Huỷ</button><button className="btn-primary" disabled={!customer || !points || note.trim().length < 3} onClick={adjust}>Xác nhận điều chỉnh</button></div></div></Modal>
    <Modal open={tierOpen} onClose={() => setTierOpen(false)} title={tier ? `Cấu hình hạng ${tier.name}` : 'Cấu hình hạng'} size="lg">{tier && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Tên hiển thị</label><input className="input" value={tier.name} onChange={(e) => setTier({ ...tier, name: e.target.value })} /></div><div><label className="label">Chi tiêu tối thiểu</label><input className="input" type="number" min={0} value={tier.minSpend} onChange={(e) => setTier({ ...tier, minSpend: e.target.value })} /></div></div><div><label className="label">Các ưu đãi của hạng</label><div className="flex gap-2"><input className="input" value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="Ví dụ: Miễn phí giao hàng" /><button className="btn-outline" disabled={!benefit.trim()} onClick={() => { setTier({ ...tier, benefits: [...tier.benefits, benefit.trim()] }); setBenefit(''); }}>Thêm</button></div><div className="mt-2 flex flex-wrap gap-2">{tier.benefits.map((text: string, index: number) => <button key={`${text}-${index}`} className="badge bg-green-50 text-green-700" onClick={() => setTier({ ...tier, benefits: tier.benefits.filter((_: string, i: number) => i !== index) })}>{text} ×</button>)}</div></div><div><label className="label">Mã khuyến mãi tặng khi lên hạng</label><select className="input" value={tier.rewardCouponCode || ''} onChange={(e) => setTier({ ...tier, rewardCouponCode: e.target.value })}><option value="">Không tặng mã</option>{coupons.map((coupon) => <option key={coupon.id} value={coupon.code}>{coupon.code} — {coupon.description || coupon.code}</option>)}</select><p className="mt-1 text-xs text-slate-500">Mã sẽ tự động được gán riêng cho khách khi đạt hạng.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tier.isActive} onChange={(e) => setTier({ ...tier, isActive: e.target.checked })} /> Kích hoạt hạng</label><div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setTierOpen(false)}>Huỷ</button><button className="btn-primary" onClick={saveTier}>Lưu cấu hình</button></div></div>}</Modal>
  </div>;
}

function Promotions() {
  const toast = useToast(); const initial = { name: '', code: '', type: 'PERCENT', minSubtotal: '', value: '', maxDiscount: '' };
  const [list, setList] = useState<any[] | null>(null); const [open, setOpen] = useState(false); const [form, setForm] = useState(initial);
  const load = () => api<any[]>('/admin/operations/promotions').then(setList); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setOpen(false); setForm(initial); };
  const save = async () => { try { await api('/admin/operations/promotions', { method: 'POST', json: { name: form.name, code: form.code, type: form.type, rules: { minSubtotal: Number(form.minSubtotal || 0) }, actions: { value: Number(form.value || 0), percent: form.type === 'PERCENT' ? Number(form.value) : undefined, amount: form.type === 'FIXED' ? Number(form.value) : undefined, maxDiscount: Number(form.maxDiscount || 0) || undefined } } }); toast('Đã tạo khuyến mãi'); close(); load(); } catch (error: any) { toast(error.message, 'error'); } };
  return <div className="space-y-4">
    <SectionTitle title="Khuyến mãi nâng cao" description="Quản lý các chương trình giảm giá và ưu đãi." action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Thêm khuyến mãi</button>} />
    <div className="grid gap-3 md:grid-cols-2">{!list ? <Spinner /> : !list.length ? <div className="card md:col-span-2"><Empty text="Chưa có chương trình khuyến mãi" /></div> : list.map((item) => <div key={item.id} className="card"><div className="flex justify-between"><div><b>{item.name}</b><div className="text-xs text-slate-400">{item.code} · {item.type}</div></div><span className={`badge ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100'}`}>{item.isActive ? 'Đang chạy' : 'Tắt'}</span></div><div className="mt-2 text-sm text-slate-500">Đã dùng {item.usedCount}{item.usageLimit ? `/${item.usageLimit}` : ''}</div></div>)}</div>
    <Modal open={open} onClose={close} title="Thêm khuyến mãi" size="lg"><div className="grid gap-4 md:grid-cols-2"><div><label className="label">Tên chương trình</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Mã nội bộ</label><input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div><div><label className="label">Loại</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="PERCENT">Giảm %</option><option value="FIXED">Giảm tiền</option><option value="FLASH_SALE">Flash sale</option><option value="BUNDLE">Combo</option><option value="BUY_X_GET_Y">Mua X tặng Y</option></select></div><div><label className="label">Đơn tối thiểu</label><input className="input" type="number" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} /></div><div><label className="label">Giá trị</label><input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div><div><label className="label">Giảm tối đa</label><input className="input" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div><div className="flex justify-end gap-2 md:col-span-2"><button className="btn-outline" onClick={close}>Huỷ</button><button className="btn-primary" disabled={!form.name || !form.code || !form.value} onClick={save}>Tạo khuyến mãi</button></div></div></Modal>
  </div>;
}

function Crm() {
  const toast = useToast(); const initialSegment = { name: '', minSpent: '', minOrders: '', inactiveDays: '' }; const initialCampaign = { name: '', subject: '', content: '', segmentId: '' };
  const [segments, setSegments] = useState<any[] | null>(null); const [campaigns, setCampaigns] = useState<any[] | null>(null); const [segmentOpen, setSegmentOpen] = useState(false); const [campaignOpen, setCampaignOpen] = useState(false); const [segment, setSegment] = useState(initialSegment); const [campaign, setCampaign] = useState(initialCampaign);
  const load = () => Promise.all([api<any[]>('/admin/operations/segments'), api<any[]>('/admin/operations/campaigns')]).then(([a, b]) => { setSegments(a); setCampaigns(b); }); useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const addSegment = async () => { try { await api('/admin/operations/segments', { method: 'POST', json: { name: segment.name, rules: { minSpent: Number(segment.minSpent || 0), minOrders: Number(segment.minOrders || 0), inactiveDays: Number(segment.inactiveDays || 0) } } }); toast('Đã tạo phân khúc'); setSegment(initialSegment); setSegmentOpen(false); load(); } catch (error: any) { toast(error.message, 'error'); } };
  const addCampaign = async () => { try { await api('/admin/operations/campaigns', { method: 'POST', json: { name: campaign.name, subject: campaign.subject, content: campaign.content, type: 'PUSH', segmentId: campaign.segmentId ? Number(campaign.segmentId) : undefined } }); toast('Đã tạo chiến dịch'); setCampaign(initialCampaign); setCampaignOpen(false); load(); } catch (error: any) { toast(error.message, 'error'); } };
  const send = async (item: any) => { if (!(await confirmDialog(`Gửi chiến dịch “${item.name}”?`, 'Thông báo sẽ được gửi tới toàn bộ khách thuộc phân khúc.', 'Gửi ngay'))) return; try { await api(`/admin/operations/campaigns/${item.id}/send`, { method: 'POST' }); toast('Đã gửi chiến dịch'); load(); } catch (error: any) { toast(error.message, 'error'); } };
  return <div className="space-y-4">
    <SectionTitle title="CRM & marketing automation" description="Phân nhóm khách hàng và triển khai chiến dịch chăm sóc." action={<div className="flex flex-wrap gap-2"><button className="btn-outline" onClick={() => setSegmentOpen(true)}><Plus className="h-4 w-4" />Thêm phân khúc</button><button className="btn-primary" onClick={() => setCampaignOpen(true)}><Plus className="h-4 w-4" />Thêm chiến dịch</button></div>} />
    <div className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><h3 className="font-bold">Phân khúc khách hàng</h3>{!segments ? <Spinner /> : !segments.length ? <div className="card"><Empty text="Chưa có phân khúc" /></div> : segments.map((item) => <div className="card" key={item.id}><b>{item.name}</b><div className="text-sm text-slate-500">{item.memberCount} khách · {JSON.stringify(item.rules)}</div></div>)}</div><div className="space-y-3"><h3 className="font-bold">Chiến dịch Push/In-app</h3>{!campaigns ? <Spinner /> : !campaigns.length ? <div className="card"><Empty text="Chưa có chiến dịch" /></div> : campaigns.map((item) => <div className="card flex items-center gap-3" key={item.id}><div className="flex-1"><b>{item.name}</b><div className="text-xs text-slate-500">{STATUS[item.status] ?? item.status} · đã gửi {item.sentCount}/{item.totalCount}</div></div>{item.status === 'DRAFT' && <button className="btn-primary btn-sm" onClick={() => send(item)}><Send className="h-4 w-4" />Gửi</button>}</div>)}</div></div>
    <Modal open={segmentOpen} onClose={() => setSegmentOpen(false)} title="Thêm phân khúc khách hàng"><div className="space-y-4"><div><label className="label">Tên phân khúc</label><input className="input" value={segment.name} onChange={(e) => setSegment({ ...segment, name: e.target.value })} /></div><div className="grid gap-3 sm:grid-cols-3"><div><label className="label">Chi tiêu tối thiểu</label><input className="input" type="number" value={segment.minSpent} onChange={(e) => setSegment({ ...segment, minSpent: e.target.value })} /></div><div><label className="label">Số đơn tối thiểu</label><input className="input" type="number" value={segment.minOrders} onChange={(e) => setSegment({ ...segment, minOrders: e.target.value })} /></div><div><label className="label">Không mua (ngày)</label><input className="input" type="number" value={segment.inactiveDays} onChange={(e) => setSegment({ ...segment, inactiveDays: e.target.value })} /></div></div><div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setSegmentOpen(false)}>Huỷ</button><button className="btn-primary" disabled={!segment.name} onClick={addSegment}>Tạo phân khúc</button></div></div></Modal>
    <Modal open={campaignOpen} onClose={() => setCampaignOpen(false)} title="Thêm chiến dịch"><div className="space-y-4"><div><label className="label">Tên chiến dịch</label><input className="input" value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} /></div><div><label className="label">Tiêu đề thông báo</label><input className="input" value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })} /></div><div><label className="label">Nội dung</label><textarea className="input" rows={4} value={campaign.content} onChange={(e) => setCampaign({ ...campaign, content: e.target.value })} /></div><div><label className="label">Phân khúc nhận</label><select className="input" value={campaign.segmentId} onChange={(e) => setCampaign({ ...campaign, segmentId: e.target.value })}><option value="">Tất cả khách đã mua</option>{segments?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setCampaignOpen(false)}>Huỷ</button><button className="btn-primary" disabled={!campaign.name || !campaign.content} onClick={addCampaign}>Lưu nháp</button></div></div></Modal>
  </div>;
}

function Audit() {
  const [data, setData] = useState<any>(null); const [action, setAction] = useState('');
  const load = () => api<any>(`/admin/operations/audit${qs({ limit: 100, action })}`).then(setData); useEffect(() => { load(); }, [action]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="space-y-4"><SectionTitle title="Audit log toàn hệ thống" description="Lịch sử thao tác của người dùng trong cửa hàng." /><div className="card flex gap-3 p-4"><select className="input max-w-xs" value={action} onChange={(e) => setAction(e.target.value)}><option value="">Mọi thao tác</option><option>CREATE</option><option>UPDATE</option><option>DELETE</option></select><button className="btn-outline" onClick={load}><History className="h-4 w-4" />Làm mới</button></div><div className="card overflow-x-auto p-0">{!data ? <Spinner /> : !data.items.length ? <Empty text="Chưa có lịch sử thao tác" /> : <table className="table"><thead><tr><th>Thời gian</th><th>Người dùng</th><th>Thao tác</th><th>Đối tượng</th><th>Đường dẫn</th><th>IP</th></tr></thead><tbody>{data.items.map((item: any) => <tr key={item.id}><td className="text-xs">{dateTime(item.createdAt)}</td><td>{item.userEmail ?? `#${item.userId}`}</td><td><b>{item.action}</b></td><td>{item.entity}{item.entityId && ` #${item.entityId}`}</td><td className="max-w-xs truncate font-mono text-xs">{item.path}</td><td className="text-xs">{item.ip}</td></tr>)}</tbody></table>}</div></div>;
}
