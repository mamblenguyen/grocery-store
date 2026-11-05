import { DiscountType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class SaveCouponDto {
  @IsString() @MinLength(3) code: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(DiscountType) type: DiscountType;
  @IsInt() @Min(1) value: number;
  @IsOptional() @IsInt() @Min(0) minOrderValue?: number;
  @IsOptional() @IsInt() @Min(0) maxDiscount?: number | null;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ValidateCouponDto {
  @IsString() code: string;
  @IsInt() @Min(0) subtotal: number;
}
