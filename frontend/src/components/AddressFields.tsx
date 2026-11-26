'use client';
import { useEffect, useState } from 'react';
import { type AddressParts, formatAddress, getDistricts, getProvinces, getWards, type VnUnit } from '@/lib/vn-address';

/** Tải danh sách đơn vị hành chính theo cấp cha (null = chưa chọn cấp cha) */
export function useUnits(loader: (() => Promise<VnUnit[]>) | null, key: unknown) {
  const [list, setList] = useState<VnUnit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loader) { setList([]); return; }
    let alive = true;
    setLoading(true);
    loader().then((r) => alive && setList(r)).catch(() => alive && setList([])).finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { list, loading };
}

/**
 * Địa chỉ đầy đủ: Tỉnh/Thành phố → Quận/Huyện → Phường/Xã → Số nhà, tên đường.
 * Chọn cấp trên sẽ xoá các cấp dưới để luôn khớp nhau.
 */
export function AddressFields({ value, onChange, label = 'Địa chỉ', required = true, testId = 'addr', hint }: {
  value: AddressParts; onChange: (v: AddressParts) => void; label?: string; required?: boolean; testId?: string; hint?: string;
}) {
  const provinces = useUnits(getProvinces, 'p');
  const districts = useUnits(value.provinceCode != null ? () => getDistricts(value.provinceCode!) : null, value.provinceCode);
  const wards = useUnits(value.districtCode != null && !value.noWard ? () => getWards(value.districtCode!) : null, `${value.districtCode}-${value.noWard}`);
  const req = required ? ' *' : '';
  const preview = formatAddress(value);

  const pick = (list: VnUnit[], code: string) => list.find((x) => String(x.code) === code) ?? null;
  return (
    <fieldset className="space-y-2">
      <legend className="label">{label}{req}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <select className="input" required={required} value={value.provinceCode ?? ''} data-testid={`${testId}-province`}
          onChange={(e) => { const p = pick(provinces.list, e.target.value); onChange({ ...value, provinceCode: p?.code ?? null, provinceName: p?.name ?? null, districtCode: null, districtName: null, wardCode: null, wardName: null, noWard: false }); }}>
          <option value="">{provinces.loading ? 'Đang tải…' : '— Tỉnh / Thành phố —'}</option>
          {provinces.list.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <select className="input" required={required} disabled={value.provinceCode == null} value={value.districtCode ?? ''} data-testid={`${testId}-district`}
          onChange={(e) => { const d = pick(districts.list, e.target.value); onChange({ ...value, districtCode: d?.code ?? null, districtName: d?.name ?? null, wardCode: null, wardName: null, noWard: !!d && d.wardCount === 0 }); }}>
          <option value="">{districts.loading ? 'Đang tải…' : '— Quận / Huyện —'}</option>
          {districts.list.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
        <select className="input" required={required && !value.noWard} disabled={value.districtCode == null || value.noWard} value={value.wardCode ?? ''} data-testid={`${testId}-ward`}
          onChange={(e) => { const w = pick(wards.list, e.target.value); onChange({ ...value, wardCode: w?.code ?? null, wardName: w?.name ?? null }); }}>
          <option value="">{value.noWard ? 'Huyện không có cấp xã' : wards.loading ? 'Đang tải…' : '— Phường / Xã —'}</option>
          {wards.list.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
        </select>
      </div>
      <input className="input" required={required} minLength={2} value={value.street} placeholder="Số nhà, tên đường, thôn/ấp… (VD: 123 Lê Lợi)" data-testid={`${testId}-street`}
        onChange={(e) => onChange({ ...value, street: e.target.value })} />
      {hint && <p className="text-xs text-amber-600">{hint}</p>}
      {preview && <p className="text-xs text-slate-500">📍 {preview}</p>}
    </fieldset>
  );
}
