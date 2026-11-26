'use client';
import { AlertTriangle, Building2, CheckCircle2, CreditCard, Landmark, Save, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { money, vietQrUrl } from '@/lib/format';

interface Platform {
  name: string; legalName: string; taxCode: string; address: string; representative: string; representativeTitle: string;
  phone: string; email: string; website: string; ecommerceRegistration: string; settlementDays: number;
  bank: { bankBin: string; bankName: string; accountNo: string; accountName: string };
  vnpayEnabled: boolean;
  delivery: Tariff;
  // chỉ đọc
  missing?: string[]; vnpayKeys?: boolean;
}

interface Tariff {
  enabled: boolean; roadFactor: number; baseKm: number; baseFee: number; perKm: number; maxFee: number; maxDistanceKm: number;
  roundTo: number; shipperSharePercent: number; shipperMinFee: number;
}
/** Cùng công thức với backend/src/common/shipping.ts */
const roundUp = (n: number, step: number) => (step > 1 ? Math.ceil(n / step) * step : Math.ceil(n));
const feeOf = (km: number, t: Tariff) => {
  const fee = roundUp(t.baseFee + Math.max(0, Math.ceil(km - t.baseKm - 1e-9)) * t.perKm, t.roundTo);
  return t.maxFee > 0 ? Math.min(fee, t.maxFee) : fee;
};
const payOf = (km: number, t: Tariff) => Math.max(roundUp((feeOf(km, t) * t.shipperSharePercent) / 100, t.roundTo), t.shipperMinFee);

const BANKS: [string, string][] = [
  ['970436', 'Vietcombank'], ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970407', 'Techcombank'],
  ['970422', 'MB Bank'], ['970416', 'ACB'], ['970432', 'VPBank'], ['970423', 'TPBank'], ['970403', 'Sacombank'], ['970441', 'VIB'],
  ['970443', 'SHB'], ['970437', 'HDBank'], ['970448', 'OCB'], ['970426', 'MSB'], ['970440', 'SeABank'], ['970431', 'Eximbank'],
  ['970449', 'LPBank'], ['970428', 'Nam A Bank'],
];

export default function PlatformSettingsPage() {
  const toast = useToast();
  const [p, setP] = useState<Platform | null>(null);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { api<Platform>('/super/platform').then(setP).catch((e) => toast(e.message, 'error')); }, []);
  if (!p) return <Spinner />;

  const up = (patch: Partial<Platform>) => setP({ ...p, ...patch });
  const field = (k: keyof Platform, label: string, opts: { hint?: string; mono?: boolean; type?: string; required?: boolean } = {}) => (
    <div>
      <label className="label">{label}{opts.required && <span className="text-red-600"> *</span>}</label>
      <input className={`input ${opts.mono ? 'font-mono' : ''}`} type={opts.type ?? 'text'} value={String(p[k] ?? '')} onChange={(e) => up({ [k]: opts.type === 'number' ? Number(e.target.value) : e.target.value } as Partial<Platform>)} />
      {opts.hint && <p className="mt-1 text-xs text-slate-400">{opts.hint}</p>}
    </div>
  );
  const tUp = (patch: Partial<Tariff>) => setP({ ...p, delivery: { ...p.delivery, ...patch } });
  const num = (k: keyof Tariff, label: string, opts: { hint?: string; step?: number } = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" min={0} step={opts.step ?? 1} value={Number(p.delivery[k])} onChange={(e) => tUp({ [k]: Number(e.target.value) } as Partial<Tariff>)} />
      {opts.hint && <p className="mt-1 text-xs text-slate-400">{opts.hint}</p>}
    </div>
  );
  const save = async () => {
    setSaving(true);
    try {
      const { missing, vnpayKeys, ...body } = p;
      setP(await api<Platform>('/super/platform', { method: 'PUT', json: body }));
      toast('Đã lưu cấu hình sàn');
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Cấu hình sàn</h1><p className="text-sm text-slate-500">Thông tin pháp nhân vận hành sàn – dùng làm <b>Bên A</b> trong hợp đồng với đối tác, trang đăng ký đối tác và email.</p></div>
        <button className="btn-primary" disabled={saving} onClick={save}><Save className="h-4 w-4" />{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
      </div>

      {p.missing?.length
        ? <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />Còn thiếu: {p.missing.join(', ')} – chưa thể duyệt hồ sơ & gửi hợp đồng cho đối tác.</div>
        : <div className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />Đủ thông tin Bên A để gửi hợp đồng.</div>}

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-ink"><Building2 className="h-5 w-5 text-violet-600" /> Pháp nhân vận hành</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('name', 'Tên thương hiệu sàn', { hint: 'Hiển thị trong email, hợp đồng (vd. "Chợ Tạp Hoá")' })}
          {field('legalName', 'Tên doanh nghiệp (đúng giấy CN ĐKDN)', { required: true })}
          {field('taxCode', 'Mã số thuế doanh nghiệp', { mono: true, required: true })}
          {field('ecommerceRegistration', 'Đăng ký sàn TMĐT với Bộ Công Thương', { hint: 'Số / ngày xác nhận đăng ký trên online.gov.vn – bắt buộc trước khi vận hành sàn' })}
          <div className="sm:col-span-2">{field('address', 'Địa chỉ trụ sở chính', { required: true })}</div>
          {field('representative', 'Người đại diện ký hợp đồng', { required: true })}
          {field('representativeTitle', 'Chức vụ', { hint: 'Nếu không phải người đại diện theo pháp luật, cần có giấy uỷ quyền' })}
          {field('phone', 'Điện thoại')}
          {field('email', 'Email', { type: 'email' })}
          {field('website', 'Website')}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-ink"><Landmark className="h-5 w-5 text-violet-600" /> Tài khoản nhận phí gói dịch vụ</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Ngân hàng</label>
              <select className="input" value={p.bank.bankBin} onChange={(e) => up({ bank: { ...p.bank, bankBin: e.target.value, bankName: BANKS.find((b) => b[0] === e.target.value)?.[1] ?? '' } })}>
                <option value="">— Chọn ngân hàng —</option>{BANKS.map(([bin, n]) => <option key={bin} value={bin}>{n}</option>)}
              </select></div>
            <div><label className="label">Số tài khoản</label><input className="input font-mono" value={p.bank.accountNo} onChange={(e) => up({ bank: { ...p.bank, accountNo: e.target.value.replace(/\s/g, '') } })} /></div>
            <div><label className="label">Chủ tài khoản</label><input className="input uppercase" value={p.bank.accountName} onChange={(e) => up({ bank: { ...p.bank, accountName: e.target.value.toUpperCase() } })} /></div>
            <p className="text-xs text-slate-400 sm:col-span-2">Nên là tài khoản đứng tên doanh nghiệp. Đối tác chuyển khoản phí gói qua VietQR với nội dung là mã hồ sơ; sàn xuất hoá đơn điện tử cho khoản phí này.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.bank.bankBin && p.bank.accountNo && <img src={vietQrUrl(p.bank, 0, 'DT-MAU')} alt="VietQR mẫu" className="h-44 w-44 rounded-xl border" />}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-ink"><Truck className="h-5 w-5 text-violet-600" /> Phí giao hàng theo quãng đường</h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={p.delivery.enabled} onChange={(e) => tUp({ enabled: e.target.checked })} />
          <span className="text-sm"><b>Tính phí ship theo km</b><br /><span className="text-slate-500">Áp dụng cho cửa hàng chọn “Theo quãng đường” trong Cài đặt → Giao hàng (mặc định). Tắt → mọi cửa hàng dùng phí cố định của mình.</span></span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {num('baseKm', 'Số km đầu (km)', { step: 0.5 })}
          {num('baseFee', 'Giá mở cửa (₫)', { hint: 'Phí cho số km đầu' })}
          {num('perKm', 'Mỗi km tiếp theo (₫/km)', { hint: 'Tính tròn lên từng km' })}
          {num('maxFee', 'Phí tối đa (₫)', { hint: '0 = không giới hạn' })}
          {num('maxDistanceKm', 'Bán kính giao tối đa (km)', { step: 0.5, hint: '0 = không giới hạn. Xa hơn: không nhận đơn' })}
          {num('roadFactor', 'Hệ số đường đi', { step: 0.05, hint: 'Đường chim bay × hệ số ≈ đường thực tế (nội thành 1,2–1,4)' })}
          {num('roundTo', 'Làm tròn lên tới (₫)', { hint: 'VD 1.000' })}
          {num('shipperSharePercent', 'Tài xế nhận (% phí)', { hint: '100 = tài xế nhận toàn bộ phí giao' })}
          {num('shipperMinFee', 'Thu nhập tối thiểu / chuyến (₫)')}
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table text-sm">
            <thead><tr><th>Quãng đường</th>{[1, 2, 3, 5, 8, 10, 15].map((k) => <th key={k} className="text-right">{k} km</th>)}</tr></thead>
            <tbody>
              <tr><td>Khách trả</td>{[1, 2, 3, 5, 8, 10, 15].map((k) => <td key={k} className="text-right font-semibold">{p.delivery.maxDistanceKm > 0 && k > p.delivery.maxDistanceKm ? <span className="text-slate-300">ngoài vùng</span> : money(feeOf(k, p.delivery))}</td>)}</tr>
              <tr><td>Tài xế nhận</td>{[1, 2, 3, 5, 8, 10, 15].map((k) => <td key={k} className="text-right text-slate-600">{p.delivery.maxDistanceKm > 0 && k > p.delivery.maxDistanceKm ? '' : money(payOf(k, p.delivery))}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Khoảng cách = đường chim bay từ vị trí cửa hàng tới vị trí khách ghim × hệ số đường đi. Khi đơn được <b>miễn phí ship</b> (ngưỡng của cửa hàng), tài xế vẫn nhận đủ thu nhập theo km – phần này cửa hàng chịu (trừ vào tiền COD tài xế nộp lại).
          Giá trị hiện tại là mặc định tạm – hãy chỉnh theo bảng giá thực tế.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-ink"><CreditCard className="h-5 w-5 text-violet-600" /> Thanh toán online (VNPay)</h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={p.vnpayEnabled} disabled={!p.vnpayKeys && !p.vnpayEnabled} onChange={(e) => up({ vnpayEnabled: e.target.checked })} />
          <span className="text-sm"><b>Bật VNPay cho toàn sàn</b><br /><span className="text-slate-500">Hiện đang <b>{p.vnpayEnabled ? 'BẬT' : 'TẮT'}</b>. {p.vnpayKeys ? 'Server đã có khoá VNPay.' : 'Server chưa có khoá VNPAY_TMN_CODE / VNPAY_HASH_SECRET.'}</span></span>
        </label>
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          VNPay dùng <b>mã merchant chung của sàn</b> → tiền hàng đi qua tài khoản sàn, sàn trở thành nền tảng có chức năng thanh toán và phải <b>khấu trừ, khai thay, nộp thay thuế GTGT + TNCN</b> cho đối tác là hộ kinh doanh trên từng giao dịch, đồng thời đối soát chuyển tiền cho đối tác.
          Chỉ bật khi đã có quy trình đối soát & khai thuế. Khi tắt, khách thanh toán COD hoặc chuyển khoản thẳng vào tài khoản của từng cửa hàng, và hợp đồng mới sẽ ghi “Bên A không thu hộ tiền hàng”.
        </div>
        {p.vnpayEnabled && field('settlementDays', 'Số ngày làm việc đối soát, chuyển tiền thu hộ cho đối tác', { type: 'number' })}
      </section>
    </div>
  );
}
