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
    p = api<VnUnit[]>(path).catch((e) => { cache.delete(path); throw e; });
    cache.set(path, p);
  }
  return p;
}
export const getProvinces = () => load('/geo/provinces');
export const getDistricts = (provinceCode: number) => load(`/geo/provinces/${provinceCode}/districts`);
export const getWards = (districtCode: number) => load(`/geo/districts/${districtCode}/wards`);

/** Toạ độ gợi ý cho 1 địa chỉ (OpenStreetMap) – precision cho biết khớp tới mức nào */
export type GeoPrecision = 'house' | 'street' | 'ward' | 'district' | 'province';
export interface GeoSuggestion { lat: number; lng: number; precision: GeoPrecision; label: string }
export const PRECISION_LABEL: Record<GeoPrecision, string> = {
  house: 'đúng số nhà', street: 'theo tên đường', ward: 'theo phường/xã', district: 'theo quận/huyện', province: 'theo tỉnh/thành',
};
/** Mức zoom bản đồ phù hợp với độ chính xác của gợi ý */
export const PRECISION_ZOOM: Record<GeoPrecision, number> = { house: 18, street: 17, ward: 15, district: 13, province: 10 };
const geoCache = new Map<string, Promise<GeoSuggestion | null>>();
export function geocodeAddress(a: AddressParts): Promise<GeoSuggestion | null> {
  if (a.provinceCode == null) return Promise.resolve(null);
  const q = new URLSearchParams({ provinceCode: String(a.provinceCode) });
  if (a.districtCode != null) q.set('districtCode', String(a.districtCode));
  if (a.wardCode != null) q.set('wardCode', String(a.wardCode));
  if (a.street.trim().length >= 2) q.set('street', a.street.trim());
  const key = q.toString();
  let p = geoCache.get(key);
  if (!p) {
    p = api<{ result: GeoSuggestion | null }>(`/geo/geocode?${key}`).then((r) => r.result).catch(() => { geoCache.delete(key); return null; });
    geoCache.set(key, p);
  }
  return p;
}

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
