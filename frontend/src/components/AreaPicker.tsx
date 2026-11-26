'use client';
import { MapPinned, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useUnits } from '@/components/AddressFields';
import { areaLabel, getDistricts, getProvinces, getWards, type ServiceArea, type VnUnit } from '@/lib/vn-address';

const key = (a: ServiceArea) => `${a.provinceCode}/${a.districtCode ?? '*'}/${a.wardCode ?? '*'}`;

/** Vùng a đã bao trùm vùng b (cùng tỉnh và a rộng hơn hoặc bằng)? */
const covers = (a: ServiceArea, b: ServiceArea) =>
  a.provinceCode === b.provinceCode && (a.districtCode == null || (a.districtCode === b.districtCode && (a.wardCode == null || a.wardCode === b.wardCode)));

/**
 * Chọn vùng hoạt động của tài xế: mỗi vùng là cả Tỉnh/TP, cả Quận/Huyện hoặc một Phường/Xã.
 * Danh sách rỗng = nhận đơn ở mọi nơi.
 */
export function AreaPicker({ value, onChange, max = 30 }: { value: ServiceArea[]; onChange: (v: ServiceArea[]) => void; max?: number }) {
  const [p, setP] = useState<VnUnit | null>(null);
  const [d, setD] = useState<VnUnit | null>(null);
  const [w, setW] = useState<VnUnit | null>(null);
  const provinces = useUnits(getProvinces, 'p');
  const districts = useUnits(p ? () => getDistricts(p.code) : null, p?.code);
  const wards = useUnits(d && d.wardCount !== 0 ? () => getWards(d.code) : null, d?.code);
  const pick = (list: VnUnit[], code: string) => list.find((x) => String(x.code) === code) ?? null;

  const draft: ServiceArea | null = p
    ? { provinceCode: p.code, provinceName: p.name, districtCode: d?.code ?? null, districtName: d?.name ?? null, wardCode: w?.code ?? null, wardName: w?.name ?? null }
    : null;
  const already = draft && value.some((a) => covers(a, draft));

  const add = () => {
    if (!draft || already) return;
    // thêm vùng lớn → bỏ các vùng con đã nằm trong nó
    onChange([...value.filter((a) => !covers(draft, a)), draft]);
    setD(null); setW(null);
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPinned className="h-4 w-4 text-brand-600" />Vùng hoạt động</div>
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((a) => (
            <span key={key(a)} className="chip" data-testid="area-chip">
              {areaLabel(a)}{!a.districtCode && <span className="text-[11px] text-slate-400">(toàn tỉnh)</span>}
              <button type="button" onClick={() => onChange(value.filter((x) => key(x) !== key(a)))} className="text-slate-400 hover:text-red-500" aria-label={`Bỏ ${areaLabel(a)}`}><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      ) : <p className="text-xs text-slate-500">Chưa chọn vùng → nhận đơn ở <b>mọi nơi</b>.</p>}

      {value.length < max && (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select className="input" value={p?.code ?? ''} data-testid="area-province" onChange={(e) => { setP(pick(provinces.list, e.target.value)); setD(null); setW(null); }}>
            <option value="">{provinces.loading ? 'Đang tải…' : '— Tỉnh / Thành phố —'}</option>
            {provinces.list.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
          <select className="input" value={d?.code ?? ''} disabled={!p} data-testid="area-district" onChange={(e) => { setD(pick(districts.list, e.target.value)); setW(null); }}>
            <option value="">{districts.loading ? 'Đang tải…' : 'Toàn tỉnh / thành phố'}</option>
            {districts.list.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
          <select className="input" value={w?.code ?? ''} disabled={!d || d.wardCount === 0} data-testid="area-ward" onChange={(e) => setW(pick(wards.list, e.target.value))}>
            <option value="">{wards.loading ? 'Đang tải…' : 'Toàn quận / huyện'}</option>
            {wards.list.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
          <button type="button" className="btn-outline" disabled={!draft || !!already} onClick={add} data-testid="area-add"><Plus className="h-4 w-4" />Thêm</button>
        </div>
      )}
      {already && <p className="text-xs text-amber-600">Vùng này đã nằm trong danh sách.</p>}
      <p className="text-xs text-slate-400">Tài xế chỉ thấy & nhận thông báo đơn có cửa hàng (điểm lấy hàng) nằm trong vùng hoạt động.</p>
    </div>
  );
}
