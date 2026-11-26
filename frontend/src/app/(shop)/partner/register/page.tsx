'use client';
import { AlertTriangle, CheckCircle2, FileSignature, LogIn, PartyPopper, Repeat, Send, Upload } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AddressFields } from '@/components/AddressFields';
import { ContractView, DocTile, Timeline } from '@/components/partner/PartnerParts';
import { defaultPlanId, PlanPicker, type PlanValue, quoteOf } from '@/components/PlanPicker';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { money, vietQrUrl } from '@/lib/format';
import type { AddonChoice } from '@/lib/billing';
import { APP_STATUS, type PartnerApplication, type PartnerInfo } from '@/lib/partner';
import { type AddressParts, EMPTY_ADDRESS, isComplete, toParts, toPayload } from '@/lib/vn-address';

const BANKS = ['Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB Bank', 'ACB', 'VPBank', 'TPBank', 'Sacombank', 'VIB', 'SHB', 'HDBank', 'OCB', 'MSB', 'SeABank', 'Eximbank', 'LPBank', 'Nam A Bank'];
const OPEN = ['DRAFT', 'SUBMITTED', 'NEED_INFO', 'APPROVED'];

type Form = {
  storeName: string; desiredSlug: string; storePhone: string; storeEmail: string; categories: string;
  businessType: 'HKD' | 'CONG_TY'; businessName: string; taxCode: string; licenseNo: string; licenseDate: string; licensePlace: string;
  representative: string; representativeTitle: string; representativeId: string; representativeIdDate: string; representativePhone: string; representativeEmail: string;
  bankName: string; bankAccountNo: string; bankAccountName: string; planId: string; months: number; addons: AddonChoice[];
};
const EMPTY: Form = {
  storeName: '', desiredSlug: '', storePhone: '', storeEmail: '', categories: '', businessType: 'HKD', businessName: '', taxCode: '', licenseNo: '',
  licenseDate: '', licensePlace: '', representative: '', representativeTitle: '', representativeId: '', representativeIdDate: '', representativePhone: '',
  representativeEmail: '', bankName: '', bankAccountNo: '', bankAccountName: '', planId: '', months: 1, addons: [],
};
const fromApp = (a: PartnerApplication): Form => ({
  storeName: a.storeName, desiredSlug: a.desiredSlug ?? '', storePhone: a.storePhone, storeEmail: a.storeEmail ?? '', categories: a.categories ?? '',
  businessType: a.businessType, businessName: a.businessName, taxCode: a.taxCode, licenseNo: a.licenseNo, licenseDate: a.licenseDate?.slice(0, 10) ?? '',
  licensePlace: a.licensePlace ?? '', representative: a.representative, representativeTitle: a.representativeTitle ?? '', representativeId: a.representativeId,
  representativeIdDate: a.representativeIdDate?.slice(0, 10) ?? '', representativePhone: a.representativePhone, representativeEmail: a.representativeEmail,
  bankName: a.bankName, bankAccountNo: a.bankAccountNo, bankAccountName: a.bankAccountName, planId: a.planId ? String(a.planId) : '', months: a.months, addons: a.addons ?? [],
});

function Inner() {
  const toast = useToast();
  const planParam = useSearchParams().get('plan');
  const { user, loading } = useAuth();
  const [info, setInfo] = useState<PartnerInfo | null>(null);
  const [app, setApp] = useState<PartnerApplication | null | undefined>(undefined);
  const [f, setF] = useState<Form>({ ...EMPTY, planId: planParam ?? '' });
  const [store, setStore] = useState<AddressParts>(EMPTY_ADDRESS);
  const [biz, setBiz] = useState<AddressParts>(EMPTY_ADDRESS);
  const [sameAddr, setSameAddr] = useState(true);
  const [agree, setAgree] = useState({ terms: false, privacy: false });
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState('DKKD');
  const [sign, setSign] = useState({ name: '', agree: false });
  const [planEdit, setPlanEdit] = useState<PlanValue | null>(null);

  const fill = useCallback((a: PartnerApplication | null) => {
    setApp(a);
    if (a && OPEN.includes(a.status)) {
      setF(fromApp(a));
      setStore(toParts(a.storeAddressParts));
      setSameAddr(!a.businessAddressParts);
      if (a.businessAddressParts) setBiz(toParts(a.businessAddressParts));
    }
  }, []);
  useEffect(() => { api<PartnerInfo>('/partner/info').then(setInfo).catch(() => {}); }, []);
  // Chưa chọn gói → mặc định gói Miễn phí
  useEffect(() => { if (info && !f.planId) setF((x) => (x.planId ? x : { ...x, planId: defaultPlanId(info.plans) })); }, [info, f.planId]);
  useEffect(() => {
    if (loading) return;
    if (!user) { setApp(null); return; }
    api<PartnerApplication | null>('/partner/application').then(fill).catch(() => setApp(null));
  }, [user, loading, fill]);
  useEffect(() => { if (user && !f.representativeEmail && !app) setF((x) => ({ ...x, representativeEmail: user.email, representative: x.representative || user.fullName })); }, [user, app, f.representativeEmail]);

  if (loading || app === undefined) return <Spinner className="py-32" />;
  if (!user)
    return (
      <div className="container-x py-16"><div className="card mx-auto max-w-lg text-center">
        <LogIn className="mx-auto h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-xl font-bold">Đăng nhập để đăng ký đối tác</h1>
        <p className="mt-2 text-sm text-slate-500">Tài khoản này sẽ trở thành tài khoản <b>Chủ cửa hàng</b> sau khi hồ sơ được kích hoạt. Hãy dùng email bạn sẽ quản lý cửa hàng lâu dài.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/login?next=/partner/register" className="btn-primary">Đăng nhập</Link>
          <Link href="/register?next=/partner/register" className="btn-outline">Tạo tài khoản</Link>
        </div>
      </div></div>
    );
  if (user.role !== 'CUSTOMER' && !app)
    return <div className="container-x py-16"><div className="card mx-auto max-w-lg text-center text-slate-600">Tài khoản <b>{user.email}</b> đang là tài khoản quản trị / nhân viên / tài xế. Vui lòng đăng xuất và dùng một tài khoản khách hàng riêng để đăng ký đối tác.</div></div>;

  const status = app?.status;
  const editable = !app || fresh || status === 'DRAFT' || status === 'NEED_INFO';
  const showForm = editable && (!app || fresh || OPEN.includes(app.status));
  const up = (p: Partial<Form>) => setF({ ...f, ...p });

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isComplete(store)) return toast('Chọn đủ địa chỉ cửa hàng (Tỉnh – Huyện – Xã, số nhà)', 'error');
    if (!sameAddr && !isComplete(biz)) return toast('Chọn đủ địa chỉ đăng ký kinh doanh', 'error');
    const body = {
      ...f, planId: f.planId ? Number(f.planId) : null, months: Number(f.months), addons: f.addons,
      licenseDate: f.licenseDate || undefined, representativeIdDate: f.representativeIdDate || undefined,
      storeAddressParts: toPayload(store), businessAddressParts: sameAddr ? null : toPayload(biz),
    };
    setBusy(true);
    try {
      const r = !app || fresh || !OPEN.includes(app.status)
        ? await api<PartnerApplication>('/partner/application', { method: 'POST', json: { ...body, agreeTerms: agree.terms, agreePrivacy: agree.privacy } })
        : await api<PartnerApplication>('/partner/application', { method: 'PATCH', json: body });
      setFresh(false); fill(r); toast('Đã lưu hồ sơ – hãy tải lên giấy tờ');
    } catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const upload = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast('File tối đa 4MB', 'error');
    const fd = new FormData(); fd.append('type', docType); fd.append('file', file);
    setBusy(true);
    try { fill(await api<PartnerApplication>('/partner/application/documents', { method: 'POST', body: fd })); toast('Đã tải lên'); }
    catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const act = async (path: string, msg: string, json?: unknown) => {
    setBusy(true);
    try { fill(await api<PartnerApplication>(`/partner/application/${path}`, { method: 'POST', ...(json !== undefined && { json }) })); toast(msg); }
    catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const savePlan = async () => {
    if (!planEdit) return;
    if (app?.status === 'APPROVED' && !(await confirmDialog('Đổi gói dịch vụ?', 'Hợp đồng sẽ được sinh lại theo gói mới (cùng số hợp đồng). Bạn cần đọc lại trước khi ký.', 'Đổi gói'))) return;
    setBusy(true);
    try {
      fill(await api<PartnerApplication>('/partner/application/plan', { method: 'PATCH', json: { planId: planEdit.planId ? Number(planEdit.planId) : null, months: planEdit.months, addons: planEdit.addons } }));
      setPlanEdit(null); toast('Đã cập nhật gói dịch vụ');
    } catch (err: any) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const canChangePlan = !!app && !fresh && (app.status === 'SUBMITTED' || (app.status === 'APPROVED' && !app.contractSignedAt && !app.paidAt));
  const docLabel = (t: string) => info?.documents.find((d) => d.type === t)?.label ?? t;
  const missing = info?.documents.filter((d) => d.required && !app?.documents.some((x) => x.type === d.type)) ?? [];
  const input = (k: keyof Form, label: string, opts: { type?: string; required?: boolean; placeholder?: string; hint?: string; mono?: boolean } = {}) => (
    <div>
      <label className="label">{label}{opts.required !== false && ' *'}</label>
      <input className={`input ${opts.mono ? 'font-mono' : ''}`} type={opts.type ?? 'text'} required={opts.required !== false} placeholder={opts.placeholder} value={String(f[k] ?? '')} onChange={(e) => up({ [k]: e.target.value } as Partial<Form>)} />
      {opts.hint && <p className="mt-1 text-xs text-slate-400">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="container-x max-w-5xl space-y-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">Đăng ký làm đối tác</h1><p className="text-sm text-slate-500"><Link href="/partner" className="link">Xem quy trình & giấy tờ cần chuẩn bị</Link></p></div>
        {app && !fresh && <div className="text-right text-sm">Hồ sơ <b className="font-mono">{app.code}</b> <span className={`badge ml-1 ${APP_STATUS[app.status].cls}`}>{APP_STATUS[app.status].label}</span></div>}
      </div>

      {/* ───── Trạng thái kết thúc ───── */}
      {app && !fresh && app.status === 'ACTIVATED' && (
        <div className="card text-center">
          <PartyPopper className="mx-auto h-12 w-12 text-brand-600" />
          <h2 className="mt-3 text-xl font-bold">Cửa hàng {app.store?.name} đã được kích hoạt!</h2>
          <p className="mt-2 text-slate-500">Tài khoản của bạn đã có quyền Chủ cửa hàng. Hãy cập nhật thuế suất GTGT cho sản phẩm và khai báo hoá đơn điện tử trong Cài đặt.</p>
          <a href="/admin" className="btn-primary mt-5 inline-flex">Vào trang quản trị</a>
        </div>
      )}
      {app && !fresh && (app.status === 'REJECTED' || app.status === 'CANCELLED') && (
        <div className="card space-y-3">
          <div className="flex items-start gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
            <div><div className="font-bold">{app.status === 'REJECTED' ? 'Hồ sơ không được duyệt' : 'Bạn đã rút hồ sơ'}</div>{app.rejectReason && <p className="mt-1 text-sm text-slate-600">Lý do: {app.rejectReason}</p>}</div></div>
          <button className="btn-primary" onClick={() => { setFresh(true); setF(fromApp(app)); setStore(toParts(app.storeAddressParts)); }}>Tạo hồ sơ mới (dùng lại thông tin cũ)</button>
        </div>
      )}
      {app?.status === 'NEED_INFO' && <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><b>Sàn yêu cầu bổ sung:</b> {app.reviewNote}<br />Cập nhật thông tin / giấy tờ bên dưới rồi bấm “Nộp bổ sung”.</div>}
      {app?.status === 'SUBMITTED' && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Hồ sơ đang được thẩm định (thường 1–3 ngày làm việc). Bạn sẽ nhận thông báo & email khi có kết quả.</div>}

      {/* ───── Form hồ sơ ───── */}
      {showForm && (
        <form onSubmit={save} className="space-y-5">
          <section className="card space-y-4">
            <h2 className="font-bold text-ink">1. Thông tin cửa hàng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {input('storeName', 'Tên cửa hàng (hiển thị trên sàn)')}
              {input('desiredSlug', 'Đường dẫn mong muốn', { required: false, placeholder: 'tap-hoa-co-lan', hint: 'Chỉ a-z, 0-9, dấu gạch ngang. Để trống sẽ tự tạo từ tên.' })}
              {input('storePhone', 'Số điện thoại cửa hàng', { type: 'tel' })}
              {input('storeEmail', 'Email cửa hàng', { type: 'email', required: false })}
            </div>
            <AddressFields label="Địa chỉ cửa hàng (điểm lấy hàng)" testId="partner-store-addr" value={store} onChange={setStore} />
            <div><label className="label">Ngành hàng kinh doanh chính</label><textarea className="input" rows={2} placeholder="Thực phẩm khô, đồ uống, rau củ, sữa, hoá mỹ phẩm, rượu bia, thuốc lá…" value={f.categories} onChange={(e) => up({ categories: e.target.value })} />
              <p className="mt-1 text-xs text-slate-400">Kinh doanh rượu / thuốc lá cần tải giấy phép bán lẻ tương ứng.</p></div>
          </section>

          <section className="card space-y-4">
            <h2 className="font-bold text-ink">2. Thông tin pháp lý</h2>
            <div className="flex gap-2">{([['HKD', 'Hộ kinh doanh'], ['CONG_TY', 'Doanh nghiệp']] as const).map(([k, l]) => <button key={k} type="button" className={`chip ${f.businessType === k ? 'chip-active' : ''}`} onClick={() => up({ businessType: k })}>{l}</button>)}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              {input('businessName', f.businessType === 'HKD' ? 'Tên hộ kinh doanh (đúng như trên giấy CN)' : 'Tên doanh nghiệp (đúng như trên giấy CN)')}
              {input('taxCode', 'Mã số thuế', { mono: true, hint: f.businessType === 'HKD' ? 'Hộ kinh doanh: số định danh cá nhân 12 số của chủ hộ (hoặc MST 10 số cũ).' : 'Doanh nghiệp: 10 số (chi nhánh 10-3 số).' })}
              {input('licenseNo', 'Số giấy chứng nhận đăng ký kinh doanh', { mono: true })}
              <div className="grid grid-cols-2 gap-3">{input('licenseDate', 'Ngày cấp', { type: 'date', required: false })}{input('licensePlace', 'Nơi cấp', { required: false })}</div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sameAddr} onChange={(e) => setSameAddr(e.target.checked)} /> Địa chỉ đăng ký kinh doanh trùng địa chỉ cửa hàng</label>
            {!sameAddr && <AddressFields label="Địa chỉ đăng ký kinh doanh (theo giấy CN)" testId="partner-biz-addr" value={biz} onChange={setBiz} />}
          </section>

          <section className="card space-y-4">
            <h2 className="font-bold text-ink">3. Người đại diện ký hợp đồng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {input('representative', f.businessType === 'HKD' ? 'Họ tên chủ hộ' : 'Họ tên người đại diện')}
              {input('representativeTitle', 'Chức vụ', { required: false, placeholder: f.businessType === 'HKD' ? 'Chủ hộ kinh doanh' : 'Giám đốc' })}
              {input('representativeId', 'Số CCCD (12 số)', { mono: true })}
              {input('representativeIdDate', 'Ngày cấp CCCD', { type: 'date', required: false })}
              {input('representativePhone', 'Số điện thoại', { type: 'tel' })}
              {input('representativeEmail', 'Email nhận hợp đồng & thông báo', { type: 'email' })}
            </div>
            {f.businessType === 'CONG_TY' && <p className="text-xs text-slate-500">Nếu người ký không phải người đại diện theo pháp luật, tải thêm <b>Giấy uỷ quyền</b> ở bước giấy tờ.</p>}
          </section>

          <section className="card space-y-4">
            <h2 className="font-bold text-ink">4. Tài khoản nhận tiền hàng</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">Ngân hàng *</label><input className="input" list="banks" required value={f.bankName} onChange={(e) => up({ bankName: e.target.value })} /><datalist id="banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist></div>
              {input('bankAccountNo', 'Số tài khoản', { mono: true })}
              {input('bankAccountName', 'Chủ tài khoản', { hint: 'Phải đứng tên hộ kinh doanh / chủ hộ hoặc doanh nghiệp.' })}
            </div>
          </section>

          <section className="card space-y-4">
            <div><h2 className="font-bold text-ink">5. Gói dịch vụ</h2><p className="text-sm text-slate-500">Mặc định là gói <b>Miễn phí</b> (không thời hạn). Bạn có thể chọn gói trả phí, mua thêm hạn mức, và đổi lại trực tiếp cho tới trước khi ký hợp đồng.</p></div>
            {info && <PlanPicker plans={info.plans} packs={info.addonPacks} value={{ planId: f.planId, months: f.months, addons: f.addons }} onChange={(v) => up(v)} />}
            <p className="text-xs text-slate-400">Phí chính thức ghi trong hợp đồng sau khi sàn duyệt hồ sơ.</p>
          </section>

          {(!app || fresh || !OPEN.includes(app.status)) && (
            <section className="card space-y-2 text-sm">
              <label className="flex gap-2"><input type="checkbox" className="mt-1" checked={agree.terms} onChange={(e) => setAgree({ ...agree, terms: e.target.checked })} /> <span>Tôi cam kết thông tin & giấy tờ cung cấp là trung thực, đã đọc và đồng ý <b>Quy chế hoạt động</b> của sàn và các điều khoản dành cho người bán.</span></label>
              <label className="flex gap-2"><input type="checkbox" className="mt-1" checked={agree.privacy} onChange={(e) => setAgree({ ...agree, privacy: e.target.checked })} /> <span>Tôi đồng ý cho {info?.platform.legalName || 'đơn vị vận hành sàn'} xử lý dữ liệu cá nhân (họ tên, số CCCD, ảnh giấy tờ, số điện thoại, email, tài khoản ngân hàng) để <b>xác thực người bán, ký kết & thực hiện hợp đồng</b> và cung cấp cho cơ quan nhà nước khi có yêu cầu theo quy định. Tôi có quyền yêu cầu xem, sửa, xoá dữ liệu theo pháp luật về bảo vệ dữ liệu cá nhân.</span></label>
            </section>
          )}
          <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : app && !fresh && OPEN.includes(app.status) ? 'Lưu thay đổi' : 'Lưu & tiếp tục tải giấy tờ'}</button></div>
        </form>
      )}

      {/* ───── Gói dịch vụ (đổi trực tiếp khi đang thẩm định / đã duyệt nhưng chưa ký) ───── */}
      {canChangePlan && info && (() => {
        const cur = quoteOf(info.plans, info.addonPacks, { planId: app!.planId ? String(app!.planId) : '', months: app!.months, addons: app!.addons ?? [] });
        return (
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-ink">Gói dịch vụ đã chọn</h2>
                <p className="text-sm text-slate-600">{cur.plan?.name}{cur.free ? ' (miễn phí, không thời hạn)' : ` · ${cur.months} tháng`}{cur.lines.map((l) => ` · ${l.pack.name}${l.units > 1 ? ` × ${l.units}` : ''}`).join('')} – tạm tính <b>{money(cur.total)}</b></p>
              </div>
              {!planEdit && <button className="btn-outline btn-sm" onClick={() => setPlanEdit({ planId: cur.plan ? String(cur.plan.id) : '', months: app!.months, addons: app!.addons ?? [] })}><Repeat className="h-4 w-4" /> Đổi gói</button>}
            </div>
            {planEdit && (
              <>
                <PlanPicker plans={info.plans} packs={info.addonPacks} value={planEdit} onChange={setPlanEdit} />
                {app!.status === 'APPROVED' && <p className="rounded-lg bg-sky-50 p-2 text-sm text-sky-900">Hồ sơ đã được duyệt: đổi gói sẽ sinh lại hợp đồng với phí theo bảng giá.</p>}
                <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setPlanEdit(null)}>Huỷ</button><button className="btn-primary" disabled={busy} onClick={savePlan}>Lưu gói</button></div>
              </>
            )}
          </section>
        );
      })()}

      {/* ───── Giấy tờ ───── */}
      {app && !fresh && OPEN.includes(app.status) && (
        <section className="card space-y-4">
          <h2 className="font-bold text-ink">Giấy tờ đính kèm</h2>
          {editable && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3">
              <div className="min-w-64 flex-1"><label className="label">Loại giấy tờ</label>
                <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>{info?.documents.map((d) => <option key={d.type} value={d.type}>{d.required ? '★ ' : ''}{d.label}</option>)}</select></div>
              <label className={`btn-outline cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" /> Chọn file (ảnh / PDF ≤ 4MB)
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
            </div>
          )}
          {missing.length > 0 && <p className="text-sm text-red-600">Còn thiếu (bắt buộc): {missing.map((m) => m.label).join('; ')}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {app.documents.map((d) => (
              <DocTile key={d.id} doc={d} label={docLabel(d.type)} onDelete={editable ? async () => {
                if (!(await confirmDialog('Xoá file này?', d.fileName, 'Xoá', true))) return;
                try { fill(await api<PartnerApplication>(`/partner/application/documents/${d.id}`, { method: 'DELETE' })); } catch (err: any) { toast(err.message, 'error'); }
              } : undefined} />
            ))}
          </div>
          <p className="text-xs text-slate-400">Giấy tờ được lưu riêng tư, chỉ bạn và quản trị sàn xem được.</p>
          {editable && (
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
              <button className="btn-ghost text-red-600" disabled={busy} onClick={async () => { if (await confirmDialog('Rút hồ sơ?', 'Hồ sơ sẽ bị huỷ.', 'Rút hồ sơ', true)) act('cancel', 'Đã rút hồ sơ'); }}>Rút hồ sơ</button>
              <button className="btn-primary" disabled={busy || missing.length > 0} onClick={() => act('submit', 'Đã nộp hồ sơ')}><Send className="h-4 w-4" /> {status === 'NEED_INFO' ? 'Nộp bổ sung' : 'Nộp hồ sơ'}</button>
            </div>
          )}
        </section>
      )}

      {/* ───── Hợp đồng & thanh toán ───── */}
      {app && !fresh && app.status === 'APPROVED' && app.contractData && (
        <>
          <section className="card">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-ink"><FileSignature className="h-5 w-5 text-brand-600" /> Hợp đồng số {app.contractNo}</h2>
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 p-5">
              <ContractView c={app.contractData} hash={app.contractHash} signed={app.contractSignedAt ? { name: app.contractSignerName!, at: app.contractSignedAt, ip: app.contractSignerIp } : null} />
            </div>
            {!app.contractSignedAt ? (
              <div className="mt-4 space-y-3 rounded-xl bg-sky-50 p-4">
                <label className="flex gap-2 text-sm"><input type="checkbox" className="mt-1" checked={sign.agree} onChange={(e) => setSign({ ...sign, agree: e.target.checked })} /> Tôi đã đọc toàn bộ Hợp đồng, đồng ý với các điều khoản và ký Hợp đồng bằng hình thức điện tử với tư cách người đại diện của Bên B.</label>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-64 flex-1"><label className="label">Nhập đúng họ tên người đại diện để ký: <b>{app.representative}</b></label><input className="input" value={sign.name} onChange={(e) => setSign({ ...sign, name: e.target.value })} /></div>
                  <button className="btn-primary" disabled={busy || !sign.agree || !sign.name.trim()} onClick={() => act('sign', 'Đã ký hợp đồng', { fullName: sign.name, agree: sign.agree })}><FileSignature className="h-4 w-4" /> Ký hợp đồng</button>
                </div>
              </div>
            ) : <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Đã ký lúc {new Date(app.contractSignedAt).toLocaleString('vi-VN')}</p>}
            <div className="mt-3 text-right"><a href="/print/contract" target="_blank" className="link text-sm">In / lưu PDF hợp đồng</a></div>
          </section>

          {app.contractData.commercial.amount > 0 && (
            <section className="card">
              <h2 className="mb-3 font-bold text-ink">Thanh toán phí dịch vụ</h2>
              {app.paidAt ? <p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Sàn đã xác nhận nhận {money(app.paymentAmount ?? 0)}. Cửa hàng sẽ được kích hoạt sớm.</p>
                : info?.platform.bank.accountNo ? (
                  <div className="flex flex-wrap items-center gap-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={vietQrUrl(info.platform.bank, app.contractData.commercial.amount, app.code)} alt="VietQR" className="h-44 w-44 rounded-xl border" />
                    <div className="space-y-1 text-sm">
                      <div>Ngân hàng: <b>{info.platform.bank.bankName}</b></div>
                      <div>Số tài khoản: <b className="font-mono">{info.platform.bank.accountNo}</b></div>
                      <div>Chủ tài khoản: <b>{info.platform.bank.accountName}</b></div>
                      <div>Số tiền: <b className="text-brand-700">{money(app.contractData.commercial.amount)}</b></div>
                      <div>Nội dung: <b className="font-mono">{app.code}</b></div>
                      <p className="pt-1 text-xs text-slate-400">Sàn đối soát và xác nhận thủ công trong giờ làm việc.</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-500">Sàn sẽ liên hệ hướng dẫn thanh toán.</p>}
            </section>
          )}
        </>
      )}

      {app && !fresh && !!app.history?.length && <section className="card"><h2 className="mb-3 font-bold text-ink">Lịch sử xử lý</h2><Timeline items={app.history} /></section>}
    </div>
  );
}

export default function PartnerRegisterPage() {
  return <Suspense fallback={<Spinner className="py-32" />}><Inner /></Suspense>;
}
