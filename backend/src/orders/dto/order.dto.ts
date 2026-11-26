import { OrderChannel, OrderStatus, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { AddressPartsDto } from '../../geo/vn-address';

export class OrderItemInput {
  @IsInt() variantId: number;
  @IsInt() @Min(1) quantity: number;
}

export class PreviewOrderDto {
  @IsArray() @ArrayMinSize(1, { message: 'Giỏ hàng trống' })
  @ValidateNested({ each: true }) @Type(() => OrderItemInput)
  items: OrderItemInput[];
  @IsOptional() @IsString() couponCode?: string;
  /** Vị trí giao hàng (ghim trên bản đồ / GPS) – dùng tính phí ship theo quãng đường */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
}

const TAX_CODE = /^(\d{10}(-\d{3})?|\d{12})$/;
const TAX_CODE_MSG = 'Mã số thuế gồm 10 số, 10-3 số (chi nhánh) hoặc số định danh cá nhân 12 số';

/** Thông tin người mua để xuất hoá đơn điện tử (NĐ 123/2020 sửa đổi bởi NĐ 70/2025) */
export class EInvoiceRequestDto {
  @IsIn(['CA_NHAN', 'TO_CHUC']) buyerType: 'CA_NHAN' | 'TO_CHUC';
  @IsString() @MinLength(2, { message: 'Nhập họ tên người mua' }) @MaxLength(191) buyerName: string;
  @IsOptional() @IsString() @MaxLength(191) buyerCompany?: string;
  /** MST doanh nghiệp 10 số, chi nhánh 10-3 số; cá nhân dùng số định danh 12 số */
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(TAX_CODE, { message: TAX_CODE_MSG }) buyerTaxCode?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(/^\d{12}$/, { message: 'Số định danh cá nhân / CCCD gồm 12 số' }) buyerIdNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) buyerAddress?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsEmail({}, { message: 'Email nhận hoá đơn không hợp lệ' }) buyerEmail?: string;
}

export class IssueEInvoiceDto {
  @IsOptional() @IsIn(['REQUESTED', 'ISSUED', 'CANCELLED']) status?: 'REQUESTED' | 'ISSUED' | 'CANCELLED';
  // Người mua (bắt buộc khi tạo mới tại quầy)
  @IsOptional() @IsIn(['CA_NHAN', 'TO_CHUC']) buyerType?: 'CA_NHAN' | 'TO_CHUC';
  @IsOptional() @IsString() @MaxLength(191) buyerName?: string;
  @IsOptional() @IsString() @MaxLength(191) buyerCompany?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(TAX_CODE, { message: TAX_CODE_MSG }) buyerTaxCode?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @Matches(/^\d{12}$/, { message: 'Số định danh cá nhân / CCCD gồm 12 số' }) buyerIdNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) buyerAddress?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsEmail({}, { message: 'Email nhận hoá đơn không hợp lệ' }) buyerEmail?: string;
  // Hoá đơn đã phát hành trên phần mềm HĐĐT
  @IsOptional() @IsString() series?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() @MaxLength(64) taxAuthorityCode?: string;
  @IsOptional() @IsString() @MaxLength(64) lookupCode?: string;
  @IsOptional() @IsString() @MaxLength(500) lookupUrl?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsString() note?: string;
}

export class CreateOrderDto extends PreviewOrderDto {
  @IsString() @MinLength(2) customerName: string;
  @IsString() @Matches(/^[0-9+\s]{9,15}$/, { message: 'Số điện thoại không hợp lệ' }) phone: string;
  /** Địa chỉ giao hàng đủ Tỉnh/TP – Quận/Huyện – Phường/Xã + số nhà, đường (address của đơn được ghép tự động) */
  @ValidateNested() @Type(() => AddressPartsDto) addressParts: AddressPartsDto;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(['COD', 'BANK_TRANSFER', 'VNPAY']) paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'VNPAY';
  /** yyyy-mm-dd */
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() deliverySlot?: string;
  /** Yêu cầu xuất hoá đơn điện tử (tuỳ chọn) */
  @IsOptional() @ValidateNested() @Type(() => EInvoiceRequestDto) einvoice?: EInvoiceRequestDto;
}

/** Bán tại quầy */
export class PosOrderDto extends PreviewOrderDto {
  /** QR thành viên động đã quét tại POS (LOYALTY:<token>) */
  @IsOptional() @IsString() posToken?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() note?: string;
  @IsIn(['CASH', 'BANK_TRANSFER']) paymentMethod: 'CASH' | 'BANK_TRANSFER';
  @IsOptional() @IsInt() @Min(0) cashReceived?: number;
  /** Giảm giá trực tiếp tại quầy (VND) */
  @IsOptional() @IsInt() @Min(0) manualDiscount?: number;
}

export class QueryOrdersDto extends PaginationDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsOptional() @IsString() cancelReason?: string;
}

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus) paymentStatus: PaymentStatus;
}

export class CancelOrderDto {
  @IsOptional() @IsString() reason?: string;
}
