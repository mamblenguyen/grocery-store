import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  private cache?: { value: StoreSettings; at: number };

  constructor(private prisma: PrismaService) {}

  async get(): Promise<StoreSettings> {
    if (this.cache && Date.now() - this.cache.at < TTL) return this.cache.value;
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    const value = merge(DEFAULT_SETTINGS, row?.value ?? {});
    this.cache = { value, at: Date.now() };
    return value;
  }

  /** VNPay chỉ dùng được khi bật trong cài đặt VÀ đã cấu hình khoá bí mật trong env */
  vnpayConfigured() {
    return !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
  }

  /** Dữ liệu an toàn cho trang khách hàng */
  async getPublic() {
    const s = await this.get();
    return {
      ...s,
      payment: { ...s.payment, vnpay: s.payment.vnpay && this.vnpayConfigured() },
    };
  }

  async getAdmin() {
    return { ...(await this.get()), vnpayConfigured: this.vnpayConfigured() };
  }

  async update(patch: Partial<StoreSettings>) {
    const next = merge(await this.get(), patch);
    if (next.shippingFee < 0 || next.freeShippingThreshold < 0 || next.minOrderValue < 0)
      throw new BadRequestException('Giá trị tiền không được âm');
    next.deliverySlots = next.deliverySlots.map((s) => String(s).trim()).filter(Boolean);
    next.banners = (next.banners ?? []).filter((b) => b?.image);
    next.deliveryDaysAhead = Math.min(14, Math.max(0, Math.floor(next.deliveryDaysAhead)));
    await this.prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: next as unknown as Prisma.InputJsonValue },
      update: { value: next as unknown as Prisma.InputJsonValue },
    });
    this.cache = undefined;
    return this.getAdmin();
  }
}
