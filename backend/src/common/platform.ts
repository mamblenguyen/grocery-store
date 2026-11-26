import { BadRequestException, Body, Controller, Get, Global, Injectable, Module, Put } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryTariff, defaultTariff } from './shipping';
import { SuperOnly } from './decorators';

/**
 * Cấu hình cấp sàn – super admin chỉnh trong CMS (/super/platform), lưu bảng PlatformSetting (key "platform").
 * Gồm thông tin pháp nhân vận hành sàn (Bên A trong hợp đồng đối tác), tài khoản nhận phí gói và các công tắc thanh toán.
 */
export interface PlatformInfo {
  name: string;
  legalName: string;
  taxCode: string;
  address: string;
  representative: string;
  representativeTitle: string;
  phone: string;
  email: string;
  website: string;
  /** Số / ngày xác nhận đăng ký website-ứng dụng cung cấp dịch vụ TMĐT với Bộ Công Thương */
  ecommerceRegistration: string;
  /** Số ngày làm việc đối soát tiền hàng thu hộ (chỉ khi sàn thu hộ tiền qua cổng thanh toán) */
  settlementDays: number;
  bank: { bankBin: string; bankName: string; accountNo: string; accountName: string };
  /**
   * Bật cổng VNPay dùng mã merchant CHUNG của sàn. Khi bật, tiền hàng đi qua tài khoản sàn → sàn thuộc diện
   * khấu trừ, khai thay, nộp thay thuế cho HKD (NĐ 117/2025 → NĐ 252/2026). Mặc định TẮT.
   */
  vnpayEnabled: boolean;
  /** Biểu phí giao hàng theo quãng đường (phí khách trả & thu nhập tài xế) */
  delivery: DeliveryTariff;
}

const KEY = 'platform';
const TTL = 30_000;

/** Giá trị mặc định (lấy từ .env nếu có – để tương thích bản cài cũ) */
function defaults(): PlatformInfo {
  const e = process.env;
  return {
    name: e.PLATFORM_NAME || 'Chợ Tạp Hoá',
    legalName: e.PLATFORM_LEGAL_NAME || '',
    taxCode: e.PLATFORM_TAX_CODE || '',
    address: e.PLATFORM_ADDRESS || '',
    representative: e.PLATFORM_REPRESENTATIVE || '',
    representativeTitle: e.PLATFORM_REPRESENTATIVE_TITLE || 'Giám đốc',
    phone: e.PLATFORM_PHONE || '',
    email: e.PLATFORM_EMAIL || '',
    website: e.APP_URL || '',
    ecommerceRegistration: '',
    settlementDays: Number(e.PLATFORM_SETTLEMENT_DAYS) || 7,
    bank: {
      bankBin: e.PLATFORM_BANK_BIN || '', bankName: e.PLATFORM_BANK_NAME || '',
      accountNo: e.PLATFORM_BANK_ACCOUNT_NO || '', accountName: e.PLATFORM_BANK_ACCOUNT_NAME || '',
    },
    vnpayEnabled: false,
    delivery: defaultTariff(),
  };
}

/** Thiếu thông tin pháp nhân → không cho gửi hợp đồng (tránh hợp đồng thiếu Bên A) */
export function missingPlatformInfo(p: PlatformInfo) {
  const need: [string, string][] = [
    [p.legalName, 'Tên pháp nhân'], [p.taxCode, 'Mã số thuế'], [p.address, 'Địa chỉ trụ sở'], [p.representative, 'Người đại diện'],
  ];
  return need.filter(([v]) => !v?.trim()).map(([, k]) => k);
}

@Injectable()
export class PlatformService {
  private cache: { value: PlatformInfo; at: number } | null = null;
  constructor(private prisma: PrismaService) {}

  async get(): Promise<PlatformInfo> {
    if (this.cache && Date.now() - this.cache.at < TTL) return this.cache.value;
    const row = await this.prisma.platformSetting.findUnique({ where: { key: KEY } }).catch(() => null);
    const d = defaults();
    const v = (row?.value ?? {}) as Partial<PlatformInfo>;
    const value: PlatformInfo = { ...d, ...v, bank: { ...d.bank, ...(v.bank ?? {}) }, delivery: { ...d.delivery, ...(v.delivery ?? {}) } };
    this.cache = { value, at: Date.now() };
    return value;
  }

  /** VNPay chỉ hoạt động khi super admin bật VÀ server có khoá VNPay */
  async vnpayAvailable() {
    return (await this.get()).vnpayEnabled && !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
  }

  async update(patch: Partial<PlatformInfo>) {
    const cur = await this.get();
    const next: PlatformInfo = { ...cur, ...patch, bank: { ...cur.bank, ...(patch.bank ?? {}) }, delivery: { ...cur.delivery, ...(patch.delivery ?? {}) } };
    const t = next.delivery;
    if (t.baseKm < 0 || t.baseFee < 0 || t.perKm < 0 || t.maxFee < 0 || t.maxDistanceKm < 0 || t.shipperMinFee < 0)
      throw new BadRequestException('Biểu phí giao hàng không được có giá trị âm');
    if (t.roadFactor < 1 || t.roadFactor > 3) throw new BadRequestException('Hệ số đường đi từ 1 đến 3');
    if (t.maxFee > 0 && t.maxFee < t.baseFee) throw new BadRequestException('Phí tối đa phải lớn hơn giá mở cửa');
    for (const k of Object.keys(next) as (keyof PlatformInfo)[]) if (typeof next[k] === 'string') (next as any)[k] = (next[k] as string).trim();
    if (next.vnpayEnabled && !(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET))
      throw new BadRequestException('Server chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET – không thể bật VNPay');
    await this.prisma.platformSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: next as unknown as Prisma.InputJsonObject },
      update: { value: next as unknown as Prisma.InputJsonObject },
    });
    this.cache = null;
    return this.admin();
  }

  async admin() {
    const p = await this.get();
    return { ...p, missing: missingPlatformInfo(p), vnpayKeys: !!(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET) };
  }
}

class BankDto {
  @IsOptional() @IsString() @MaxLength(10) bankBin?: string;
  @IsOptional() @IsString() @MaxLength(100) bankName?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(/^\d{6,20}$/, { message: 'Số tài khoản gồm 6–20 chữ số' }) accountNo?: string;
  @IsOptional() @IsString() @MaxLength(100) accountName?: string;
}
class DeliveryDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(3) roadFactor?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(50) baseKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) baseFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) perKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(500) maxDistanceKm?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) roundTo?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) shipperSharePercent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) shipperMinFee?: number;
}
class PlatformDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(191) legalName?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(/^\d{10}(-\d{3})?$/, { message: 'Mã số thuế doanh nghiệp gồm 10 số (hoặc 10-3)' }) taxCode?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(191) representative?: string;
  @IsOptional() @IsString() @MaxLength(100) representativeTitle?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsEmail({}, { message: 'Email không hợp lệ' }) email?: string;
  @IsOptional() @IsString() @MaxLength(191) website?: string;
  @IsOptional() @IsString() @MaxLength(191) ecommerceRegistration?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) settlementDays?: number;
  @IsOptional() @ValidateNested() @Type(() => BankDto) bank?: BankDto;
  @IsOptional() @IsBoolean() vnpayEnabled?: boolean;
  @IsOptional() @ValidateNested() @Type(() => DeliveryDto) delivery?: DeliveryDto;
}

@Controller('super/platform')
@SuperOnly()
export class PlatformController {
  constructor(private s: PlatformService) {}
  @Get() get() { return this.s.admin(); }
  @Put() update(@Body() dto: PlatformDto) { return this.s.update(dto as Partial<PlatformInfo>); }
}

@Global()
@Module({ controllers: [PlatformController], providers: [PlatformService], exports: [PlatformService] })
export class PlatformModule {}
