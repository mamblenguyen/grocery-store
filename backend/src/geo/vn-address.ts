import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { VN_UNITS, type VnDistrict, type VnProvince } from './vn-units.data';

// ───────────── Tra cứu nhanh theo mã ─────────────
const provinces = new Map<number, VnProvince>();
const districts = new Map<number, { d: VnDistrict; provinceCode: number }>();
const wards = new Map<number, { name: string; districtCode: number }>();
for (const p of VN_UNITS) {
  provinces.set(p[0], p);
  for (const d of p[2]) {
    districts.set(d[0], { d, provinceCode: p[0] });
    for (const w of d[2]) wards.set(w[0], { name: w[1], districtCode: d[0] });
  }
}

export const listProvinces = () => VN_UNITS.map(([code, name]) => ({ code, name }));
export const listDistricts = (provinceCode: number) => (provinces.get(provinceCode)?.[2] ?? []).map(([code, name, w]) => ({ code, name, wardCount: w.length }));
export const listWards = (districtCode: number) => (districts.get(districtCode)?.d[2] ?? []).map(([code, name]) => ({ code, name }));

/** Tên Tỉnh/Huyện/Xã theo mã (bỏ qua mã không hợp lệ hoặc không khớp cấp cha) */
export function unitNames(provinceCode?: number | null, districtCode?: number | null, wardCode?: number | null) {
  const p = provinceCode != null ? provinces.get(provinceCode) : undefined;
  if (!p) return null;
  const d = districtCode != null ? districts.get(districtCode) : undefined;
  const dOk = d && d.provinceCode === p[0] ? d : undefined;
  const w = dOk && wardCode != null ? wards.get(wardCode) : undefined;
  return { provinceName: p[1], districtName: dOk?.d[1] ?? null, wardName: w && w.districtCode === dOk!.d[0] ? w.name : null };
}

/** Địa chỉ hành chính đầy đủ (đã chuẩn hoá tên theo mã) */
export interface AddressParts {
  street: string;
  provinceCode: number; provinceName: string;
  districtCode: number; districtName: string;
  /** null khi huyện không có cấp xã (huyện đảo: Bạch Long Vĩ, Cồn Cỏ, Lý Sơn, Côn Đảo, Hoàng Sa) */
  wardCode: number | null; wardName: string | null;
}

/** Vùng hoạt động: cả tỉnh / cả huyện / một xã */
export interface ServiceArea {
  provinceCode: number; provinceName: string;
  districtCode: number | null; districtName: string | null;
  wardCode: number | null; wardName: string | null;
}

/** Địa chỉ phải đủ: số nhà/đường + Tỉnh/TP + Quận/Huyện + Phường/Xã */
export class AddressPartsDto {
  @IsString() @MinLength(2, { message: 'Nhập số nhà, tên đường' }) @MaxLength(255) street: string;
  @Type(() => Number) @IsInt({ message: 'Chọn Tỉnh/Thành phố' }) provinceCode: number;
  @Type(() => Number) @IsInt({ message: 'Chọn Quận/Huyện' }) districtCode: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt({ message: 'Chọn Phường/Xã' }) wardCode?: number | null;
}

export class ServiceAreaDto {
  @Type(() => Number) @IsInt({ message: 'Chọn Tỉnh/Thành phố' }) provinceCode: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() districtCode?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() wardCode?: number | null;
}

/** Kiểm tra mã Tỉnh – Huyện – Xã khớp nhau và đủ cấp, trả về tên chuẩn */
export function resolveAddress(dto: AddressPartsDto, label = 'Địa chỉ'): AddressParts {
  const p = provinces.get(Number(dto.provinceCode));
  if (!p) throw new BadRequestException(`${label}: Tỉnh/Thành phố không hợp lệ`);
  const d = districts.get(Number(dto.districtCode));
  if (!d || d.provinceCode !== p[0]) throw new BadRequestException(`${label}: Quận/Huyện không thuộc ${p[1]}`);
  let wardCode: number | null = null, wardName: string | null = null;
  if (d.d[2].length) {
    const w = dto.wardCode != null ? wards.get(Number(dto.wardCode)) : undefined;
    if (!w) throw new BadRequestException(`${label}: chọn Phường/Xã`);
    if (w.districtCode !== d.d[0]) throw new BadRequestException(`${label}: Phường/Xã không thuộc ${d.d[1]}`);
    wardCode = Number(dto.wardCode); wardName = w.name;
  }
  const street = dto.street?.trim();
  if (!street || street.length < 2) throw new BadRequestException(`${label}: nhập số nhà, tên đường`);
  return { street, provinceCode: p[0], provinceName: p[1], districtCode: d.d[0], districtName: d.d[1], wardCode, wardName };
}

/** "12 Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh" */
export const formatAddress = (a: Pick<AddressParts, 'street' | 'wardName' | 'districtName' | 'provinceName'>) =>
  [a.street, a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ');

export function resolveArea(dto: ServiceAreaDto): ServiceArea {
  const p = provinces.get(Number(dto.provinceCode));
  if (!p) throw new BadRequestException('Vùng hoạt động: Tỉnh/Thành phố không hợp lệ');
  const out: ServiceArea = { provinceCode: p[0], provinceName: p[1], districtCode: null, districtName: null, wardCode: null, wardName: null };
  if (dto.districtCode != null) {
    const d = districts.get(Number(dto.districtCode));
    if (!d || d.provinceCode !== p[0]) throw new BadRequestException(`Vùng hoạt động: Quận/Huyện không thuộc ${p[1]}`);
    out.districtCode = d.d[0]; out.districtName = d.d[1];
    if (dto.wardCode != null) {
      const w = wards.get(Number(dto.wardCode));
      if (!w || w.districtCode !== d.d[0]) throw new BadRequestException(`Vùng hoạt động: Phường/Xã không thuộc ${d.d[1]}`);
      out.wardCode = Number(dto.wardCode); out.wardName = w.name;
    }
  } else if (dto.wardCode != null) throw new BadRequestException('Vùng hoạt động: chọn Quận/Huyện trước khi chọn Phường/Xã');
  return out;
}

/** Chuẩn hoá danh sách vùng: bỏ trùng, bỏ vùng con đã nằm trong vùng lớn hơn */
export function resolveAreas(list: ServiceAreaDto[]): ServiceArea[] {
  const all = list.map(resolveArea);
  const key = (a: ServiceArea) => `${a.provinceCode}/${a.districtCode ?? '*'}/${a.wardCode ?? '*'}`;
  const uniq = [...new Map(all.map((a) => [key(a), a])).values()];
  return uniq.filter((a) => !uniq.some((b) => b !== a && covers(b, a)));
}

/** Vùng a bao trùm vùng b? */
function covers(a: ServiceArea, b: ServiceArea) {
  if (a.provinceCode !== b.provinceCode) return false;
  if (a.districtCode == null) return b.districtCode != null || b.wardCode != null;
  if (a.districtCode !== b.districtCode) return false;
  return a.wardCode == null && b.wardCode != null;
}

export const areaLabel = (a: ServiceArea) => [a.wardName, a.districtName, a.provinceName].filter(Boolean).join(', ');

/** Đọc danh sách vùng đã lưu (JSON) an toàn */
export function readAreas(v: unknown): ServiceArea[] {
  return Array.isArray(v) ? (v.filter((a) => a && typeof a === 'object' && typeof (a as ServiceArea).provinceCode === 'number') as ServiceArea[]) : [];
}

/**
 * Điểm (cửa hàng) có nằm trong vùng hoạt động không.
 * - Tài xế chưa chọn vùng → nhận đơn mọi nơi.
 * - Điểm chưa khai báo tỉnh/huyện (dữ liệu cũ) → không xác định được, coi như trong vùng để không bỏ sót đơn.
 */
type AreaPlace = { provinceCode?: number | null; districtCode?: number | null; wardCode?: number | null };

/** Nơi dùng để xét vùng của 1 chuyến giao: cửa hàng (điểm lấy hàng); cửa hàng chưa khai báo tỉnh → địa chỉ giao của đơn */
export function deliveryPlace(store: AreaPlace, dropoff?: AreaPlace | null): AreaPlace {
  return store.provinceCode != null || !dropoff ? store : dropoff;
}

export function inAreas(areas: ServiceArea[], place: AreaPlace) {
  if (!areas.length || place.provinceCode == null) return true;
  return areas.some((a) =>
    a.provinceCode === place.provinceCode &&
    (a.districtCode == null || a.districtCode === place.districtCode) &&
    (a.wardCode == null || a.wardCode === place.wardCode));
}

/** Cột địa chỉ hành chính + chuỗi address đầy đủ (dùng chung cho Store, Address, Order; null = xoá) */
export function storeAddressData(dto: AddressPartsDto, label?: string): AddressParts & { address: string };
export function storeAddressData(dto: AddressPartsDto | null, label?: string): Record<keyof AddressParts | 'address', null> | (AddressParts & { address: string });
export function storeAddressData(dto: AddressPartsDto | null, label = 'Địa chỉ cửa hàng') {
  if (dto === null)
    return { address: null, street: null, provinceCode: null, provinceName: null, districtCode: null, districtName: null, wardCode: null, wardName: null };
  const a = resolveAddress(dto, label);
  return { ...a, address: formatAddress(a) };
}

/** Dữ liệu ghi vào bảng Store cho địa chỉ đăng ký kinh doanh (null = xoá) */
export function businessAddressData(dto: AddressPartsDto | null) {
  if (dto === null) return { businessAddress: null, businessAddressParts: Prisma.DbNull };
  const a = resolveAddress(dto, 'Địa chỉ đăng ký kinh doanh');
  return { businessAddress: formatAddress(a), businessAddressParts: a as unknown as Prisma.InputJsonObject };
}

/** Các cột địa chỉ hành chính của Store (dùng trong select) */
export const STORE_ADDRESS_SELECT = {
  street: true, provinceCode: true, provinceName: true, districtCode: true, districtName: true, wardCode: true, wardName: true,
} as const;
