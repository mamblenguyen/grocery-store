import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Min, MinLength, ValidateNested,
} from 'class-validator';
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
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
}

export class QueryOrdersDto extends PaginationDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
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
