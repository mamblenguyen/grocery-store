import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { storeId } from '../common/tenant';
import { clearStoreCache } from '../common/tenant.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SETTINGS, StoreSettings } from './settings.types';

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

  constructor(private prisma: PrismaService) {}

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

  /** VNPay chỉ dùng được khi bật trong cài đặt VÀ nền tảng đã cấu hình khoá bí mật trong env */
  vnpayConfigured() {
    return !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
  }

  /** Dữ liệu an toàn cho trang khách hàng */
  async getPublic(id: number = storeId()) {
    const s = await this.get(id);
    return {
      ...s,
      payment: { ...s.payment, vnpay: s.payment.vnpay && this.vnpayConfigured(), bankTransfer: s.payment.bankTransfer && !!s.bank.accountNo },
    };
  }

  async getAdmin() {
    const id = storeId();
    const st = await this.prisma.store.findUnique({ where: { id }, select: { lat: true, lng: true } });
    return { ...(await this.get(id)), vnpayConfigured: this.vnpayConfigured(), location: { lat: st?.lat ?? null, lng: st?.lng ?? null } };
  }

  /** Vị trí cửa hàng = điểm tài xế đến lấy hàng */
  async setLocation(lat: number | null, lng: number | null) {
    await this.prisma.store.update({ where: { id: storeId() }, data: { lat, lng } });
    return this.getAdmin();
  }

  async update(patch: Partial<StoreSettings>) {
    const id = storeId();
    const next = merge(await this.get(id), patch);
    if (next.shippingFee < 0 || next.freeShippingThreshold < 0 || next.minOrderValue < 0)
      throw new BadRequestException('Giá trị tiền không được âm');
    if (next.payment.bankTransfer && (!next.bank.accountNo || !next.bank.accountName))
      throw new BadRequestException('Nhập số tài khoản & chủ tài khoản trước khi bật chuyển khoản');
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
      data: { name: next.storeName?.trim() || undefined, phone: next.hotline || null, email: next.email || null, address: next.address || null, logo: next.logo || null },
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
