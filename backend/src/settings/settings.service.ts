import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { storeId } from '../common/tenant';
import { clearStoreCache } from '../common/tenant.middleware';
import { AddressPartsDto, STORE_ADDRESS_SELECT, storeAddressData } from '../geo/vn-address';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SETTINGS, StoreSettings } from './settings.types';
import { VAT_RATES } from '../common/vat';
import { PlatformService } from '../common/platform';

const KEY = 'store';
const TTL = 30_000;

/** Gộp sâu: giữ giá trị mặc định cho các trường chưa lưu */
function merge<T>(base: T, patch: any): T {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return (patch ?? base) as T;
  const out: any = { ...base };
  for (const k of Object.keys(base as any)) {
    if (patch && k in patch) out[k] = merge((base as any)[k], patch[k]);
  }
  return out;
}

@Injectable()
export class SettingsService {
  private cache = new Map<number, { value: StoreSettings; at: number }>();

  constructor(private prisma: PrismaService, private platform: PlatformService) {}

  /** Cài đặt của cửa hàng (mặc định: cửa hàng của request hiện tại) */
  async get(id: number = storeId()): Promise<StoreSettings> {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const [row, store] = await Promise.all([
      this.prisma.setting.findUnique({ where: { storeId_key: { storeId: id, key: KEY } } }),
      this.prisma.store.findUnique({ where: { id }, select: { name: true, phone: true, email: true, address: true, logo: true } }),
    ]);
    const base: StoreSettings = {
      ...DEFAULT_SETTINGS,
      storeName: store?.name ?? DEFAULT_SETTINGS.storeName,
      hotline: store?.phone ?? '', email: store?.email ?? '', address: store?.address ?? '', logo: store?.logo ?? '',
    };
    const value = merge(base, row?.value ?? {});
    this.cache.set(id, { value, at: Date.now() });
    return value;
  }

  /** VNPay chỉ dùng được khi super admin bật cho toàn sàn (CMS) VÀ server có khoá VNPay. Hiện mặc định TẮT. */
  vnpayConfigured() {
    return this.platform.vnpayAvailable();
  }

  /** Dữ liệu an toàn cho trang khách hàng */
  async getPublic(id: number = storeId()) {
    const s = await this.get(id);
    return {
      ...s,
      payment: { ...s.payment, vnpay: s.payment.vnpay && (await this.vnpayConfigured()), bankTransfer: s.payment.bankTransfer && !!s.bank.accountNo },
    };
  }

  async getAdmin() {
    const id = storeId();
    const st = await this.prisma.store.findUnique({ where: { id }, select: { lat: true, lng: true, ...STORE_ADDRESS_SELECT } });
    const { lat, lng, ...parts } = st ?? ({} as Partial<NonNullable<typeof st>>);
    return {
      ...(await this.get(id)), vnpayConfigured: await this.vnpayConfigured(), location: { lat: lat ?? null, lng: lng ?? null },
      /** Địa chỉ theo Tỉnh/Huyện/Xã; null = cửa hàng cũ chưa khai báo */
      addressParts: parts.provinceCode != null ? parts : null,
    };
  }

  /** Vị trí cửa hàng = điểm tài xế đến lấy hàng */
  async setLocation(lat: number | null, lng: number | null) {
    await this.prisma.store.update({ where: { id: storeId() }, data: { lat, lng } });
    return this.getAdmin();
  }

  /** Địa chỉ cửa hàng đủ Tỉnh/TP – Quận/Huyện – Phường/Xã → ghép thành chuỗi địa chỉ hiển thị */
  async setAddress(dto: AddressPartsDto) {
    const id = storeId();
    const data = storeAddressData(dto);
    const store = await this.prisma.store.update({ where: { id }, data, select: { slug: true } });
    const row = await this.prisma.setting.findUnique({ where: { storeId_key: { storeId: id, key: KEY } } });
    if (row?.value && typeof row.value === 'object')
      await this.prisma.setting.update({ where: { storeId_key: { storeId: id, key: KEY } }, data: { value: { ...(row.value as object), address: data.address } } });
    clearStoreCache(store.slug);
    this.cache.delete(id);
    return this.getAdmin();
  }

  async update(patch: Partial<StoreSettings>) {
    const id = storeId();
    // Địa chỉ chỉ đổi qua setAddress (bắt buộc chọn Tỉnh/Huyện/Xã)
    if (patch && typeof patch === 'object') delete (patch as Partial<StoreSettings>).address;
    const next = merge(await this.get(id), patch);
    if (!['DISTANCE', 'FIXED'].includes(next.shippingMode)) throw new BadRequestException('Cách tính phí giao hàng không hợp lệ');
    if (next.shippingFee < 0 || next.freeShippingThreshold < 0 || next.minOrderValue < 0)
      throw new BadRequestException('Giá trị tiền không được âm');
    if (next.payment.bankTransfer && (!next.bank.accountNo || !next.bank.accountName))
      throw new BadRequestException('Nhập số tài khoản & chủ tài khoản trước khi bật chuyển khoản');
    // Thuế & hoá đơn điện tử
    if (!['KHAU_TRU', 'TRUC_TIEP', 'MIEN'].includes(next.tax.method)) throw new BadRequestException('Phương pháp tính thuế không hợp lệ');
    next.tax.defaultVatRate = String(next.tax.defaultVatRate);
    if (!(VAT_RATES as readonly string[]).includes(next.tax.defaultVatRate)) throw new BadRequestException('Thuế suất mặc định không hợp lệ');
    // Mẫu số theo phương pháp thuế: khấu trừ → 1 (HĐ GTGT); trực tiếp / miễn → 2 (HĐ bán hàng)
    next.einvoice.templateCode = next.tax.method === 'KHAU_TRU' ? '1' : '2';
    next.einvoice.series = String(next.einvoice.series ?? '').trim().toUpperCase();
    if (next.einvoice.series && !/^[CK]\d{2}[A-Z]{3}$/.test(next.einvoice.series))
      throw new BadRequestException('Ký hiệu hoá đơn gồm 6 ký tự: C/K + 2 số cuối năm + 1 chữ loại hoá đơn + 2 chữ do cửa hàng tự đặt (vd C26MAA)');
    if (next.einvoice.enabled && (!next.taxCode || !next.einvoice.provider))
      throw new BadRequestException('Nhập mã số thuế và nhà cung cấp hoá đơn điện tử trước khi bật nhận yêu cầu xuất hoá đơn');
    next.deliverySlots = next.deliverySlots.map((s) => String(s).trim()).filter(Boolean);
    next.banners = (next.banners ?? []).filter((b) => b?.image);
    next.deliveryDaysAhead = Math.min(14, Math.max(0, Math.floor(next.deliveryDaysAhead)));
    await this.prisma.setting.upsert({
      where: { storeId_key: { storeId: id, key: KEY } },
      create: { storeId: id, key: KEY, value: next as unknown as Prisma.InputJsonValue },
      update: { value: next as unknown as Prisma.InputJsonValue },
    });
    // Đồng bộ thông tin cơ bản sang bảng Store (dùng cho danh bạ cửa hàng & super admin)
    const store = await this.prisma.store.update({
      where: { id },
      data: { name: next.storeName?.trim() || undefined, phone: next.hotline || null, email: next.email || null, logo: next.logo || null },
      select: { slug: true },
    });
    clearStoreCache(store.slug);
    this.cache.delete(id);
    return this.getAdmin();
  }

  invalidate(id: number) {
    this.cache.delete(id);
  }
}
