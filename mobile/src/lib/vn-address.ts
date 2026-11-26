import { api } from './api';

/** Đơn vị hành chính 3 cấp: Tỉnh/TP → Quận/Huyện → Phường/Xã */
export interface VnUnit { code: number; name: string; wardCount?: number }

/** Địa chỉ đầy đủ theo Tỉnh/Huyện/Xã (khớp AddressParts ở backend) */
export interface AddressParts {
  street: string;
  provinceCode: number | null; provinceName: string | null;
  districtCode: number | null; districtName: string | null;
  wardCode: number | null; wardName: string | null;
  /** (chỉ ở giao diện) huyện đã chọn không có cấp xã – huyện đảo */
  noWard?: boolean;
}

/** Vùng hoạt động của tài xế: cả tỉnh / cả huyện / một xã */
export interface ServiceArea {
  provinceCode: number; provinceName: string;
  districtCode: number | null; districtName: string | null;
  wardCode: number | null; wardName: string | null;
}

export const EMPTY_ADDRESS: AddressParts = { street: '', provinceCode: null, provinceName: null, districtCode: null, districtName: null, wardCode: null, wardName: null };

// Danh mục tĩnh → cache trong bộ nhớ, mỗi danh sách chỉ tải 1 lần
const cache = new Map<string, Promise<VnUnit[]>>();
function load(path: string) {
  let p = cache.get(path);
  if (!p) {
    p = api<VnUnit[]>(path, { store: null, auth: false }).catch((e) => { cache.delete(path); throw e; });
    cache.set(path, p);
  }
  return p;
}
export const getProvinces = () => load('/geo/provinces');
export const getDistricts = (provinceCode: number) => load(`/geo/provinces/${provinceCode}/districts`);
export const getWards = (districtCode: number) => load(`/geo/districts/${districtCode}/wards`);

/** Lấy phần địa chỉ từ object có các cột street/provinceCode/... (Store, addressParts) */
export function toParts(v?: (Omit<Partial<AddressParts>, 'street'> & { street?: string | null }) | null): AddressParts {
  if (!v || v.provinceCode == null) return { ...EMPTY_ADDRESS, street: v?.street ?? '' };
  return { ...EMPTY_ADDRESS, ...v, street: v.street ?? '', noWard: v.districtCode != null && v.wardCode == null } as AddressParts;
}

/** Đủ cấp: số nhà/đường + Tỉnh + Huyện + Xã (trừ huyện đảo không có cấp xã) */
export const isComplete = (a: AddressParts) =>
  a.street.trim().length >= 2 && a.provinceCode != null && a.districtCode != null && (a.wardCode != null || !!a.noWard);

/** Dữ liệu gửi lên API */
export const toPayload = (a: AddressParts) => ({ street: a.street.trim(), provinceCode: a.provinceCode, districtCode: a.districtCode, wardCode: a.wardCode });

export const formatAddress = (a: Partial<AddressParts>) => [a.street?.trim(), a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ');

export const areaLabel = (a: ServiceArea) => [a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ');
export const areaPayload = (list: ServiceArea[]) => list.map((a) => ({ provinceCode: a.provinceCode, districtCode: a.districtCode, wardCode: a.wardCode }));
