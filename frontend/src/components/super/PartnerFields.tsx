'use client';
import { AddressFields } from '@/components/AddressFields';
import { BUSINESS_TYPES, EMPTY_PARTNER, type PartnerFormValue } from '@/lib/super';
import { type AddressParts, EMPTY_ADDRESS, toParts, toPayload } from '@/lib/vn-address';

export type PartnerForm = PartnerFormValue;

const hasAny = (a: AddressParts) => !!(a.street.trim() || a.provinceCode != null);

/** Nhóm ô nhập thông tin đối tác: pháp lý, người đại diện, tài khoản đối soát, hợp đồng */
export function PartnerFields({ value: f, onChange, legacyAddress }: { value: PartnerForm; onChange: (v: PartnerForm) => void; legacyAddress?: string | null }) {
  const set = (k: Exclude<keyof PartnerForm, 'businessAddressParts'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Loại hình</label>
          <select className="input" value={f.businessType} onChange={set('businessType')}>{Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div><label className="label">Tên doanh nghiệp / hộ kinh doanh</label><input className="input" value={f.businessName} onChange={set('businessName')} placeholder="VD: Hộ kinh doanh Nguyễn Văn A" /></div>
        <div><label className="label">Mã số thuế</label><input className="input" value={f.taxCode} onChange={set('taxCode')} /></div>
      </div>
      {/* Đã nhập một phần thì bắt buộc nhập đủ Tỉnh/Huyện/Xã */}
      <AddressFields label="Địa chỉ đăng ký kinh doanh" testId="biz-addr" required={hasAny(f.businessAddressParts)}
        hint={legacyAddress && f.businessAddressParts.provinceCode == null ? `Địa chỉ cũ (chưa có Tỉnh/Huyện/Xã): ${legacyAddress}` : undefined}
        value={f.businessAddressParts} onChange={(v) => onChange({ ...f, businessAddressParts: v })} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Người đại diện</label><input className="input" value={f.representative} onChange={set('representative')} /></div>
        <div><label className="label">Số CCCD</label><input className="input" value={f.representativeId} onChange={set('representativeId')} /></div>
        <div><label className="label">SĐT người đại diện</label><input className="input" value={f.representativePhone} onChange={set('representativePhone')} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="label">Ngân hàng (đối soát)</label><input className="input" value={f.bankName} onChange={set('bankName')} placeholder="VD: Vietcombank" /></div>
        <div><label className="label">Số tài khoản</label><input className="input" value={f.bankAccountNo} onChange={set('bankAccountNo')} /></div>
        <div><label className="label">Chủ tài khoản</label><input className="input" value={f.bankAccountName} onChange={(e) => onChange({ ...f, bankAccountName: e.target.value.toUpperCase() })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Số hợp đồng</label><input className="input" value={f.contractNo} onChange={set('contractNo')} /></div>
        <div><label className="label">Ngày ký hợp đồng</label><input className="input" type="date" value={f.contractSignedAt} onChange={set('contractSignedAt')} /></div>
      </div>
    </div>
  );
}

/** Form từ dữ liệu cửa hàng đã lưu */
export function partnerForm(s: Record<string, any>, toInputDate: (d: string | null) => string): PartnerForm {
  const out = { ...EMPTY_PARTNER };
  for (const k of Object.keys(EMPTY_PARTNER) as (keyof PartnerForm)[]) {
    if (k === 'businessAddressParts') continue;
    (out as any)[k] = k === 'contractSignedAt' ? toInputDate(s.contractSignedAt ?? null) : s[k] ?? (k === 'businessType' ? 'HKD' : '');
  }
  out.businessAddressParts = s.businessAddressParts ? toParts(s.businessAddressParts) : EMPTY_ADDRESS;
  return out;
}

/** Chuẩn hoá trước khi gửi API: chuỗi rỗng → null, ngày → ISO, địa chỉ trống → null */
export const partnerPayload = (f: PartnerForm) => {
  const { businessAddressParts: addr, ...text } = f;
  return {
    ...Object.fromEntries(Object.entries(text).map(([k, v]) => [k, v === '' ? null : v])),
    contractSignedAt: f.contractSignedAt ? new Date(`${f.contractSignedAt}T12:00:00`).toISOString() : null,
    businessAddressParts: hasAny(addr) ? toPayload(addr) : null,
  };
};
