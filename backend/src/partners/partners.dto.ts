import { Type } from 'class-transformer';
import {
  ArrayMaxSize, Equals, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { PartnerAppStatus } from '@prisma/client';
import { PaginationDto } from '../common/pagination.dto';
import { AddressPartsDto } from '../geo/vn-address';

const PHONE = /^(0|\+84)\d{9,10}$/;
/** MST: doanh nghiệp 10 số (chi nhánh 10-3); hộ / cá nhân dùng số định danh cá nhân 12 số (từ 01/07/2025) */
const TAX_CODE = /^(\d{10}(-\d{3})?|\d{12})$/;

/** Gói mua thêm chọn kèm */
export class AddonChoiceDto {
  @Type(() => Number) @IsInt() packId: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) units: number;
}

/** Thông tin hồ sơ – dùng cho cả tạo mới (bắt buộc) và cập nhật (PartialType ở controller) */
export class ApplicationDto {
  // Cửa hàng
  @IsString() @MinLength(2, { message: 'Nhập tên cửa hàng' }) @MaxLength(120) storeName: string;
  @IsOptional() @IsString() @MaxLength(60) desiredSlug?: string;
  @Matches(PHONE, { message: 'Số điện thoại cửa hàng không hợp lệ' }) storePhone: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsEmail({}, { message: 'Email cửa hàng không hợp lệ' }) storeEmail?: string;
  @ValidateNested() @Type(() => AddressPartsDto) storeAddressParts: AddressPartsDto;
  @IsOptional() @IsString() @MaxLength(1000) categories?: string;

  // Pháp lý
  @IsIn(['HKD', 'CONG_TY'], { message: 'Loại hình phải là Hộ kinh doanh hoặc Doanh nghiệp' }) businessType: 'HKD' | 'CONG_TY';
  @IsString() @MinLength(2, { message: 'Nhập tên hộ kinh doanh / doanh nghiệp đúng như trên giấy chứng nhận' }) @MaxLength(191) businessName: string;
  @Matches(TAX_CODE, { message: 'Mã số thuế gồm 10 số, 10-3 số hoặc số định danh 12 số' }) taxCode: string;
  @IsString() @MinLength(3, { message: 'Nhập số Giấy chứng nhận đăng ký kinh doanh' }) @MaxLength(50) licenseNo: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsDateString() licenseDate?: string;
  @IsOptional() @IsString() @MaxLength(191) licensePlace?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @ValidateNested() @Type(() => AddressPartsDto) businessAddressParts?: AddressPartsDto | null;
  @IsString() @MinLength(4, { message: 'Nhập họ tên người đại diện' }) @MaxLength(191) representative: string;
  @IsOptional() @IsString() @MaxLength(100) representativeTitle?: string;
  @Matches(/^\d{12}$/, { message: 'Số CCCD / định danh cá nhân gồm 12 số' }) representativeId: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsDateString() representativeIdDate?: string;
  @Matches(PHONE, { message: 'Số điện thoại người đại diện không hợp lệ' }) representativePhone: string;
  @IsEmail({}, { message: 'Email người đại diện không hợp lệ' }) representativeEmail: string;
  @IsString() @MinLength(2, { message: 'Chọn ngân hàng' }) bankName: string;
  @Matches(/^\d{6,20}$/, { message: 'Số tài khoản gồm 6–20 chữ số' }) bankAccountNo: string;
  @IsString() @MinLength(2, { message: 'Nhập tên chủ tài khoản' }) bankAccountName: string;

  // Gói
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() planId?: number | null;
  @Type(() => Number) @IsInt() @Min(1) @Max(36) months: number;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AddonChoiceDto) addons?: AddonChoiceDto[];

  // Đồng ý
  @IsBoolean() @Equals(true, { message: 'Bạn cần đồng ý Quy chế hoạt động & Điều khoản dành cho người bán' }) agreeTerms: boolean;
  @IsBoolean() @Equals(true, { message: 'Bạn cần đồng ý cho xử lý dữ liệu cá nhân để xác thực người bán' }) agreePrivacy: boolean;
}

export const DOC_TYPES = ['DKKD', 'CCCD_TRUOC', 'CCCD_SAU', 'ATTP', 'UY_QUYEN', 'GP_RUOU', 'GP_THUOC_LA', 'NGAN_HANG', 'KHAC'] as const;
export class UploadDocDto {
  @IsIn(DOC_TYPES) type: (typeof DOC_TYPES)[number];
}

export class SignDto {
  @IsString() @MinLength(4) fullName: string;
  @IsBoolean() @Equals(true, { message: 'Bạn cần xác nhận đã đọc và đồng ý toàn bộ Hợp đồng' }) agree: boolean;
}

// ───── Super admin ─────
export class AppQuery extends PaginationDto {
  @IsOptional() @IsIn(Object.values(PartnerAppStatus)) status?: PartnerAppStatus;
}
export class NoteDto {
  @IsString() @MinLength(5, { message: 'Nhập nội dung (tối thiểu 5 ký tự)' }) note: string;
}
export class VerifyDto {
  @IsIn(['VNEID', 'EKYC', 'TRUC_TIEP'], { message: 'Chọn phương thức xác thực' }) method: 'VNEID' | 'EKYC' | 'TRUC_TIEP';
  @IsOptional() @IsString() note?: string;
}
export class ApproveDto {
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() planId?: number | null;
  @Type(() => Number) @IsInt() @Min(1) @Max(36) months: number;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AddonChoiceDto) addons?: AddonChoiceDto[];
  @Type(() => Number) @IsInt() @Min(0) amount: number;
  @IsOptional() @IsString() note?: string;
}
/** Đổi gói / gói mua thêm trên hồ sơ (trước khi ký hợp đồng) */
export class PlanChangeDto {
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() planId?: number | null;
  @Type(() => Number) @IsInt() @Min(1) @Max(36) months: number;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AddonChoiceDto) addons?: AddonChoiceDto[];
  /** Chỉ super admin: phí kỳ đầu thoả thuận (mặc định = theo bảng giá) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class OfflineSignDto {
  @IsString() @MinLength(4) signerName: string;
  @IsIn(['KY_SO', 'BAN_GIAY']) method: 'KY_SO' | 'BAN_GIAY';
  @IsOptional() @IsString() note?: string;
}
export class PaymentDto {
  @Type(() => Number) @IsInt() @Min(0) amount: number;
  @IsString() @MinLength(2) method: string;
  @IsOptional() @IsString() ref?: string;
}
