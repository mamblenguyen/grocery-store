'use client';
import { BUSINESS_TYPES, EMPTY_PARTNER } from '@/lib/super';

export type PartnerForm = typeof EMPTY_PARTNER;

/** Nhóm ô nhập thông tin đối tác: pháp lý, người đại diện, tài khoản đối soát, hợp đồng */
export function PartnerFields({ value: f, onChange }: { value: PartnerForm; onChange: (v: PartnerForm) => void }) {
  const set = (k: keyof PartnerForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Loại hình</label>
          <select className="input" value={f.businessType} onChange={set('businessType')}>{Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div><label className="label">Tên doanh nghiệp / hộ kinh doanh</label><input className="input" value={f.businessName} onChange={set('businessName')} placeholder="VD: Hộ kinh doanh Nguyễn Văn A" /></div>
        <div><label className="label">Mã số thuế</label><input className="input" value={f.taxCode} onChange={set('taxCode')} /></div>
        <div><label className="label">Địa chỉ đăng ký kinh doanh</label><input className="input" value={f.businessAddress} onChange={set('businessAddress')} /></div>
      </div>
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

/** Chuẩn hoá trước khi gửi API: chuỗi rỗng → null, ngày → ISO */
export const partnerPayload = (f: PartnerForm) => ({
  ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v])),
  contractSignedAt: f.contractSignedAt ? new Date(`${f.contractSignedAt}T12:00:00`).toISOString() : null,
});
