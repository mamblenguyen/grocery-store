import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class ReturnItemDto {
  @IsInt() @Min(1) orderItemId: number;
  @IsInt() @Min(1) quantity: number;
}
export class CreateReturnDto {
  @IsInt() @Min(1) orderId: number;
  @IsIn(['RETURN', 'REFUND', 'COMPLAINT']) type: string;
  @IsString() @MinLength(3) @MaxLength(191) reason: string;
  @IsOptional() @IsString() @MaxLength(5000) customerNote?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnItemDto) items: ReturnItemDto[];
  @IsOptional() @IsArray() evidence?: string[];
}
export class UpdateReturnDto {
  @IsIn(['APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'COMPLETED', 'CANCELLED']) status: string;
  @IsOptional() @IsInt() @Min(0) approvedAmount?: number;
  @IsOptional() @IsString() adminNote?: string;
  @IsOptional() @IsString() resolution?: string;
  @IsOptional() @IsString() refundMethod?: string;
  @IsOptional() @IsString() refundRef?: string;
}
export class ReconcileDto {
  @IsIn(['COD', 'PAYMENT']) type: string;
  @IsDateString() periodFrom: string;
  @IsDateString() periodTo: string;
  @IsOptional() @IsInt() @Min(0) actualAmount?: number;
  @IsOptional() @IsString() note?: string;
}
export class LoyaltyAdjustDto {
  @IsInt() userId: number;
  @IsInt() points: number;
  @IsString() @MinLength(3) note: string;
}
export class PosLoyaltyTokenDto {
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsInt() @Min(0) pointsToUse?: number;
}
export class ResolvePosLoyaltyDto {
  @IsString() token: string;
  @IsInt() @Min(0) subtotal: number;
}
export class LoyaltyTierDto {
  @IsIn(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']) key: string;
  @IsString() @MinLength(2) name: string;
  @IsInt() @Min(0) minSpend: number;
  @IsArray() benefits: string[];
  @IsOptional() @IsString() rewardCouponCode?: string;
  @IsInt() @Min(1) sortOrder: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class PromotionDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(2) code: string;
  @IsIn(['PERCENT', 'FIXED', 'BUY_X_GET_Y', 'BUNDLE', 'FLASH_SALE', 'TIER_PRICE']) type: string;
  @IsObject() rules: Record<string, unknown>;
  @IsObject() actions: Record<string, unknown>;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() stackable?: boolean;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class SegmentDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() description?: string;
  @IsObject() rules: Record<string, unknown>;
}
export class CampaignDto {
  @IsString() @MinLength(2) name: string;
  @IsIn(['PUSH', 'IN_APP']) type: string;
  @IsString() @MinLength(2) content: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsInt() segmentId?: number;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsIn(['MANUAL', 'ABANDONED_CART', 'INACTIVE_CUSTOMER', 'BIRTHDAY', 'POINT_EXPIRY']) triggerType?: string;
  @IsOptional() @IsObject() triggerData?: Record<string, unknown>;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
