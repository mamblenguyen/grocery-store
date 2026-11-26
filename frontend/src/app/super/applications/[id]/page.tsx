'use client';
import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, Circle, FileSignature, Printer, Repeat, ScanFace, Store, Wallet, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ContractView, DocTile, Timeline } from '@/components/partner/PartnerParts';
import { defaultPlanId, PlanPicker, type PlanValue, quoteOf } from '@/components/PlanPicker';
import { useToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { promptDialog } from '@/components/PromptDialog';
import { Modal, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { APP_STATUS, IDENTITY_METHOD, type PartnerApplication, type PartnerInfo } from '@/lib/partner';
import { storeUrl } from '@/lib/platform';

const DOC_LABEL: Record<string, string> = {
  DKKD: 'Giấy CN đăng ký kinh doanh', CCCD_TRUOC: 'CCCD mặt trước', CCCD_SAU: 'CCCD mặt sau', ATTP: 'ATTP', UY_QUYEN: 'Giấy uỷ quyền',
  GP_RUOU: 'Giấy phép bán lẻ rượu', GP_THUOC_LA: 'Giấy phép bán lẻ thuốc lá', NGAN_HANG: 'Xác nhận tài khoản NH', KHAC: 'Khác',
};
/** Danh mục kiểm tra khi thẩm định – người duyệt tự đánh dấu (không lưu) */
const CHECKLIST = [
  'Tên, MST, số giấy CN, địa chỉ trên hồ sơ khớp với Giấy chứng nhận đăng ký kinh doanh',
  'Tra cứu MST trên trang của Cục Thuế: đang hoạt động, đúng tên người nộp thuế',
  'Họ tên, số CCCD khớp ảnh CCCD; ảnh rõ nét, còn hạn',
  'Người đại diện đúng là chủ hộ / đại diện theo pháp luật (hoặc có giấy uỷ quyền hợp lệ)',
  'Tài khoản ngân hàng đứng tên hộ kinh doanh / chủ hộ / doanh nghiệp',
  'Ngành hàng có điều kiện (rượu, thuốc lá…) có giấy phép tương ứng; ATTP phù hợp',
  'Ngành nghề trên giấy CN phù hợp bán lẻ hàng tạp hoá / thực phẩm',
];

function Row({ k, v, mono }: { k: string; v?: React.ReactNode; mono?: boolean }) {
  return <div className="grid grid-cols-[150px_1fr] gap-2 py-1 text-sm"><span className="text-slate-500">{k}</span><span className={mono ? 'font-mono' : 'text-ink'}>{v || '—'}</span></div>;
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [a, setA] = useState<PartnerApplication | null>(null);
  const [info, setInfo] = useState<PartnerInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [modal, setModal] = useState<'' | 'verify' | 'approve' | 'pay' | 'sign' | 'plan'>('');
  const [verify, setVerify] = useState({ method: 'VNEID', note: '' });
  /** amount = null → theo bảng giá (tự tính) */
  const [approve, setApprove] = useState<{ pick: PlanValue; amount: number | null; note: string }>({ pick: { planId: '', months: 1, addons: [] }, amount: null, note: '' });
  const [pay, setPay] = useState({ amount: 0, method: 'Chuyển khoản', ref: '' });
  const [osign, setOsign] = useState({ signerName: '', method: 'KY_SO', note: '' });

  const load = useCallback(() => api<PartnerApplication>(`/super/partner-applications/${id}`).then(setA), [id]);
  useEffect(() => { load(); api<PartnerInfo>('/partner/info').then(setInfo); }, [load]);
  if (!a) return <Spinner />;

  const post = async (path: string, json: unknown, msg: string) => {
    setBusy(true);
    try { setA(await api<PartnerApplication>(`/super/partner-applications/${id}/${path}`, { method: 'POST', json })); setModal(''); toast(msg); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const plans = info?.plans ?? [];
  const packs = info?.addonPacks ?? [];
  const pickOf = (x: PartnerApplication): PlanValue => ({ planId: x.planId ? String(x.planId) : defaultPlanId(plans), months: x.months, addons: x.addons ?? [] });
  const cur = quoteOf(plans, packs, pickOf(a));
  const aq = quoteOf(plans, packs, approve.pick);
  const approveAmount = approve.amount ?? aq.total;
  const canChangePlan = a.status === 'SUBMITTED' || a.status === 'NEED_INFO' || (a.status === 'APPROVED' && !a.contractSignedAt && !a.paidAt);
  const amount = a.contractData?.commercial.amount ?? 0;
  const reviewing = a.status === 'SUBMITTED' || a.status === 'NEED_INFO';
  const missingDocs = (a.requiredDocs ?? []).filter((t) => !a.documents.some((d) => d.type === t));
  const steps = [
    { done: a.status !== 'DRAFT', label: 'Nộp hồ sơ' },
    { done: !!a.identityVerifiedAt, label: 'Xác thực danh tính' },
    { done: !!a.contractSentAt && ['APPROVED', 'ACTIVATED'].includes(a.status), label: 'Duyệt & gửi HĐ' },
    { done: !!a.contractSignedAt, label: 'Đối tác ký HĐ' },
    { done: !!a.paidAt || (a.status !== 'SUBMITTED' && !!a.contractData && amount === 0), label: 'Nhận phí' },
    { done: a.status === 'ACTIVATED', label: 'Kích hoạt' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/super/applications" className="btn-icon btn-ghost"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">{a.storeName} <span className={`badge ${APP_STATUS[a.status].cls}`}>{APP_STATUS[a.status].label}</span></h1>
            <div className="text-sm text-slate-500">Hồ sơ <span className="font-mono">{a.code}</span> · tạo {dateTime(a.createdAt)} · tài khoản {a.user?.email}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {reviewing && <button className="btn-outline" disabled={busy} onClick={() => setModal('verify')}><ScanFace className="h-4 w-4" /> Xác thực danh tính</button>}
          {a.status === 'SUBMITTED' && <button className="btn-outline" disabled={busy} onClick={async () => { const n = await promptDialog({ title: 'Yêu cầu bổ sung', label: 'Nội dung cần bổ sung', placeholder: 'VD: Ảnh CCCD mặt sau bị mờ, vui lòng chụp lại…', confirmText: 'Gửi yêu cầu' }); if (n) post('request-info', { note: n }, 'Đã gửi yêu cầu bổ sung'); }}>Yêu cầu bổ sung</button>}
          {a.status === 'SUBMITTED' && <button className="btn-primary" disabled={busy} onClick={() => { setApprove({ pick: pickOf(a), amount: null, note: '' }); setModal('approve'); }}><BadgeCheck className="h-4 w-4" /> Duyệt & gửi hợp đồng</button>}
          {canChangePlan && <button className="btn-outline" disabled={busy} onClick={() => { setApprove({ pick: pickOf(a), amount: a.status === 'APPROVED' ? amount : null, note: '' }); setModal('plan'); }}><Repeat className="h-4 w-4" /> Đổi gói</button>}
          {a.status === 'APPROVED' && !a.contractSignedAt && <button className="btn-outline" disabled={busy} onClick={() => { setOsign({ signerName: a.representative, method: 'KY_SO', note: '' }); setModal('sign'); }}><FileSignature className="h-4 w-4" /> Đã ký số / bản giấy</button>}
          {a.status === 'APPROVED' && !a.paidAt && amount > 0 && <button className="btn-outline" disabled={busy} onClick={() => { setPay({ amount, method: 'Chuyển khoản', ref: '' }); setModal('pay'); }}><Wallet className="h-4 w-4" /> Xác nhận đã nhận phí</button>}
          {a.status === 'APPROVED' && <button className="btn-primary" disabled={busy || !a.contractSignedAt || (amount > 0 && !a.paidAt)} onClick={async () => { if (await confirmDialog('Kích hoạt cửa hàng?', `Tạo cửa hàng "${a.storeName}" và cấp quyền Chủ cửa hàng cho ${a.user?.email}.`, 'Kích hoạt')) post('activate', {}, 'Đã kích hoạt cửa hàng'); }}><Store className="h-4 w-4" /> Kích hoạt</button>}
          {['SUBMITTED', 'NEED_INFO', 'APPROVED'].includes(a.status) && <button className="btn-ghost text-red-600" disabled={busy} onClick={async () => { const n = await promptDialog({ title: 'Từ chối hồ sơ', label: 'Lý do (gửi cho đối tác)', confirmText: 'Từ chối', destructive: true }); if (n) post('reject', { note: n }, 'Đã từ chối'); }}><XCircle className="h-4 w-4" /> Từ chối</button>}
          {a.store && <a href={storeUrl(a.store.slug)} target="_blank" className="btn-outline"><Store className="h-4 w-4" /> Xem cửa hàng</a>}
        </div>
      </div>

      <div className="card flex flex-wrap gap-x-6 gap-y-2">
        {steps.map((s, i) => <span key={i} className={`flex items-center gap-1.5 text-sm ${s.done ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}>{s.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}{s.label}</span>)}
      </div>
      {!!a.platformMissing?.length && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />Chưa khai báo thông tin pháp nhân của sàn (Bên A): {a.platformMissing.join(', ')} – không thể gửi hợp đồng. <Link href="/super/platform" className="font-semibold underline">Mở Cấu hình sàn</Link></div>}
      {a.status === 'NEED_INFO' && <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">Đang chờ đối tác bổ sung: {a.reviewNote}</div>}
      {a.status === 'REJECTED' && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Lý do từ chối: {a.rejectReason}</div>}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <section className="card">
              <h3 className="mb-2 font-bold text-ink">Cửa hàng</h3>
              <Row k="Tên" v={a.storeName} /><Row k="Đường dẫn" v={a.desiredSlug} mono /><Row k="Điện thoại" v={a.storePhone} /><Row k="Email" v={a.storeEmail} />
              <Row k="Địa chỉ" v={a.storeAddress} /><Row k="Ngành hàng" v={a.categories} />
              <Row k="Gói đăng ký" v={<>{cur.plan?.name ?? '—'}{cur.free ? ' · không thời hạn' : ` · ${cur.months} tháng`}{cur.lines.map((l) => <span key={l.pack.id} className="block text-xs text-slate-500">+ {l.pack.name}{l.units > 1 && ` × ${l.units}`} ({money(l.price)})</span>)}<span className="block text-xs text-slate-500">Theo bảng giá: {money(cur.total)}</span></>} />
            </section>
            <section className="card">
              <h3 className="mb-2 font-bold text-ink">Pháp lý</h3>
              <Row k="Loại hình" v={a.businessType === 'CONG_TY' ? 'Doanh nghiệp' : 'Hộ kinh doanh'} /><Row k="Tên" v={a.businessName} />
              <Row k="Mã số thuế" v={a.taxCode} mono /><Row k="Số giấy CN" v={`${a.licenseNo}${a.licenseDate ? ` · ${new Date(a.licenseDate).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}` : ''}${a.licensePlace ? ` · ${a.licensePlace}` : ''}`} />
              <Row k="Địa chỉ ĐKKD" v={a.businessAddress || '(trùng địa chỉ cửa hàng)'} />
              <a href={`https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp`} target="_blank" rel="noopener noreferrer" className="link text-xs">Tra cứu MST trên trang Cục Thuế ↗</a>
            </section>
            <section className="card">
              <h3 className="mb-2 font-bold text-ink">Người đại diện</h3>
              <Row k="Họ tên" v={a.representative} /><Row k="Chức vụ" v={a.representativeTitle} /><Row k="CCCD" v={`${a.representativeId}${a.representativeIdDate ? ` · cấp ${new Date(a.representativeIdDate).toLocaleDateString('vi-VN', { timeZone: 'UTC' })}` : ''}`} mono />
              <Row k="Điện thoại" v={a.representativePhone} /><Row k="Email" v={a.representativeEmail} />
              <Row k="Xác thực" v={a.identityVerifiedAt ? <span className="text-emerald-700">✔ {IDENTITY_METHOD[a.identityMethod ?? ''] ?? a.identityMethod} · {dateTime(a.identityVerifiedAt)}</span> : <span className="text-amber-700">Chưa xác thực</span>} />
            </section>
            <section className="card">
              <h3 className="mb-2 font-bold text-ink">Ngân hàng & thanh toán</h3>
              <Row k="Ngân hàng" v={a.bankName} /><Row k="Số TK" v={a.bankAccountNo} mono /><Row k="Chủ TK" v={a.bankAccountName} />
              {a.bankAccountName && a.businessName && !a.bankAccountName.toLowerCase().includes(a.representative.split(' ').pop()!.toLowerCase()) && !a.bankAccountName.toLowerCase().includes(a.businessName.toLowerCase().slice(0, 6)) && <p className="text-xs text-amber-700">⚠ Tên chủ TK có vẻ không khớp người đại diện / tên đơn vị</p>}
              <Row k="Phí kỳ đầu" v={a.contractData ? money(amount) : '—'} />
              <Row k="Đã nhận phí" v={a.paidAt ? `${money(a.paymentAmount ?? 0)} · ${a.paymentMethod}${a.paymentRef ? ` · ${a.paymentRef}` : ''} · ${dateTime(a.paidAt)}` : 'Chưa'} />
            </section>
          </div>

          <section className="card space-y-3">
            <h3 className="font-bold text-ink">Giấy tờ ({a.documents.length})</h3>
            {missingDocs.length > 0 && <p className="text-sm text-red-600">Thiếu bắt buộc: {missingDocs.map((t) => DOC_LABEL[t]).join(', ')}</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{a.documents.map((d) => <DocTile key={d.id} doc={d} label={DOC_LABEL[d.type] ?? d.type} />)}</div>
          </section>

          {a.contractData && (
            <section className="card">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-ink">Hợp đồng {a.contractNo}</h3><a href={`/print/contract?id=${a.id}`} target="_blank" className="btn-outline btn-sm"><Printer className="h-4 w-4" /> In</a></div>
              {a.contractSignedAt && <p className="mb-3 text-sm text-emerald-700">✔ Ký bởi {a.contractSignerName} lúc {dateTime(a.contractSignedAt)}{a.contractSignerIp && ` · IP ${a.contractSignerIp}`}{a.contractSignerUa && <span className="block text-xs text-slate-400">{a.contractSignerUa}</span>}</p>}
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 p-5"><ContractView c={a.contractData} hash={a.contractHash} signed={a.contractSignedAt ? { name: a.contractSignerName ?? '', at: a.contractSignedAt, ip: a.contractSignerIp } : null} /></div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {reviewing && (
            <section className="card">
              <h3 className="mb-3 font-bold text-ink">Danh mục thẩm định</h3>
              <div className="space-y-2">{CHECKLIST.map((c, i) => <label key={i} className="flex gap-2 text-sm"><input type="checkbox" className="mt-1" checked={checks[i]} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? e.target.checked : x)))} />{c}</label>)}</div>
              <p className="mt-3 text-xs text-slate-400">Danh mục hỗ trợ người duyệt, không lưu lại. Kết quả xác thực & duyệt được ghi vào lịch sử hồ sơ.</p>
            </section>
          )}
          <section className="card"><h3 className="mb-3 font-bold text-ink">Lịch sử xử lý</h3><Timeline items={a.history} /></section>
        </div>
      </div>

      <Modal open={modal === 'verify'} onClose={() => setModal('')} title="Xác thực danh tính người bán">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Luật TMĐT 2025 yêu cầu sàn xác thực điện tử danh tính người bán trước khi mở gian hàng. Ghi nhận phương thức đã dùng:</p>
          <select className="input" value={verify.method} onChange={(e) => setVerify({ ...verify, method: e.target.value })}>{Object.entries(IDENTITY_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <textarea className="input" rows={2} placeholder="Ghi chú (mã phiên xác thực, người đối chiếu…)" value={verify.note} onChange={(e) => setVerify({ ...verify, note: e.target.value })} />
          <div className="flex justify-end"><button className="btn-primary" disabled={busy} onClick={() => post('verify-identity', verify, 'Đã ghi nhận xác thực')}>Xác nhận</button></div>
        </div>
      </Modal>
      <Modal open={modal === 'approve'} onClose={() => setModal('')} title="Duyệt hồ sơ & gửi hợp đồng" size="lg">
        <div className="space-y-3">
          {!a.identityVerifiedAt && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Cần xác thực danh tính trước khi duyệt.</p>}
          {info && <PlanPicker plans={plans} packs={packs} value={approve.pick} onChange={(pick) => setApprove({ ...approve, pick })} monthsOptions={[1, 2, 3, 6, 12, 24, 36]} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Phí kỳ đầu ghi trong hợp đồng (₫, gồm thuế)</label><input className="input" type="number" min={0} value={approveAmount} onChange={(e) => setApprove({ ...approve, amount: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            {approve.amount != null && approve.amount !== aq.total && <p className="self-end pb-2 text-xs text-amber-700">Khác bảng giá ({money(aq.total)}) – <button type="button" className="underline" onClick={() => setApprove({ ...approve, amount: null })}>dùng giá bảng</button></p>}
          </div>
          <textarea className="input" rows={2} placeholder="Ghi chú nội bộ" value={approve.note} onChange={(e) => setApprove({ ...approve, note: e.target.value })} />
          <p className="text-xs text-slate-500">Hệ thống sinh hợp đồng từ thông tin hồ sơ + pháp nhân sàn, lưu bản chụp kèm mã băm SHA-256 và gửi email mời đối tác ký.</p>
          <div className="flex justify-end"><button className="btn-primary" disabled={busy} onClick={() => post('approve', { planId: approve.pick.planId ? Number(approve.pick.planId) : null, months: approve.pick.months, addons: approve.pick.addons, amount: approveAmount, note: approve.note || undefined }, 'Đã duyệt & gửi hợp đồng')}>Duyệt</button></div>
        </div>
      </Modal>
      <Modal open={modal === 'plan'} onClose={() => setModal('')} title="Điều chỉnh gói dịch vụ trên hồ sơ" size="lg">
        <div className="space-y-3">
          {info && <PlanPicker plans={plans} packs={packs} value={approve.pick} onChange={(pick) => setApprove({ ...approve, pick })} monthsOptions={[1, 2, 3, 6, 12, 24, 36]} />}
          {a.status === 'APPROVED' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Phí kỳ đầu (₫, gồm thuế)</label><input className="input" type="number" min={0} value={approveAmount} onChange={(e) => setApprove({ ...approve, amount: e.target.value === '' ? null : Number(e.target.value) })} /></div>
              <p className="self-end pb-2 text-xs text-sky-800">Hợp đồng chưa ký sẽ được sinh lại (cùng số, mã băm mới) và đối tác được báo đọc lại.</p>
            </div>
          )}
          <input className="input" placeholder="Lý do điều chỉnh (ghi vào lịch sử hồ sơ)" value={approve.note} onChange={(e) => setApprove({ ...approve, note: e.target.value })} />
          <div className="flex justify-end"><button className="btn-primary" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              setA(await api<PartnerApplication>(`/super/partner-applications/${id}/plan`, { method: 'PATCH', json: { planId: approve.pick.planId ? Number(approve.pick.planId) : null, months: approve.pick.months, addons: approve.pick.addons, ...(a.status === 'APPROVED' && { amount: approveAmount }), note: approve.note || undefined } }));
              setModal(''); toast('Đã điều chỉnh gói');
            } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
          }}>Lưu gói</button></div>
        </div>
      </Modal>
      <Modal open={modal === 'pay'} onClose={() => setModal('')} title="Xác nhận đã nhận phí">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Số tiền</label><input className="input" type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></div>
            <div><label className="label">Hình thức</label><input className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} /></div>
          </div>
          <div><label className="label">Mã giao dịch ngân hàng</label><input className="input font-mono" value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} /></div>
          <p className="text-xs text-slate-500">Nhớ xuất hoá đơn điện tử của sàn cho khoản phí này.</p>
          <div className="flex justify-end"><button className="btn-primary" disabled={busy} onClick={() => post('payment', pay, 'Đã ghi nhận thanh toán')}>Xác nhận</button></div>
        </div>
      </Modal>
      <Modal open={modal === 'sign'} onClose={() => setModal('')} title="Xác nhận hợp đồng đã ký ngoài hệ thống">
        <div className="space-y-3">
          <div><label className="label">Người ký (Bên B)</label><input className="input" value={osign.signerName} onChange={(e) => setOsign({ ...osign, signerName: e.target.value })} /></div>
          <select className="input" value={osign.method} onChange={(e) => setOsign({ ...osign, method: e.target.value })}><option value="KY_SO">Chữ ký số (USB token / ký số từ xa)</option><option value="BAN_GIAY">Bản giấy có chữ ký, đóng dấu</option></select>
          <textarea className="input" rows={2} placeholder="Ghi chú (nơi lưu bản gốc, mã tài liệu eContract…)" value={osign.note} onChange={(e) => setOsign({ ...osign, note: e.target.value })} />
          <div className="flex justify-end"><button className="btn-primary" disabled={busy} onClick={() => post('offline-sign', osign, 'Đã ghi nhận')}>Xác nhận</button></div>
        </div>
      </Modal>
    </div>
  );
}
