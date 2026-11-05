import { OrderChannel, OrderStatus, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export class OrderItemInput {
  @IsInt() variantId: number;
  @IsInt() @Min(1) quantity: number;
}

export class PreviewOrderDto {
  @IsArray() @ArrayMinSize(1, { message: 'Giỏ hàng trống' })
  @ValidateNested({ each: true }) @Type(() => OrderItemInput)
  items: OrderItemInput[];
  @IsOptional() @IsString() couponCode?: string;
}

export class CreateOrderDto extends PreviewOrderDto {
  @IsString() @MinLength(2) customerName: string;
  @IsString() @Matches(/^[0-9+\s]{9,15}$/, { message: 'Số điện thoại không hợp lệ' }) phone: string;
  @IsString() @MinLength(5) address: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(['COD', 'BANK_TRANSFER', 'VNPAY']) paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'VNPAY';
  /** yyyy-mm-dd */
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() deliverySlot?: string;
  /** Vị trí giao hàng (ghim trên bản đồ / GPS) */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
}

/** Bán tại quầy */
export class PosOrderDto extends PreviewOrderDto {
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
