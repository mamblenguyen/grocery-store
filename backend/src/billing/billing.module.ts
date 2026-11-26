import { Body, Controller, Delete, Get, Module, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { PurchaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { CurrentUser, StoreOwner, SuperOnly } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { LIMIT_KINDS, type PlanLimit } from '../common/plan-limits';
import { storeId } from '../common/tenant';
import { SuperModule } from '../super/super.module';
import { BillingService } from './billing.service';

class PackDto {
  @IsOptional() @IsString() code?: string;
  @IsString() @MinLength(2, { message: 'Nhập tên gói' }) @MaxLength(120) name: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() description?: string | null;
  @IsIn(LIMIT_KINDS, { message: 'Chọn loại hạn mức' }) kind: PlanLimit;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsInt() @Min(0) price: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(36) months: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
class UpdatePackDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() description?: string | null;
  @IsOptional() @IsIn(LIMIT_KINDS) kind?: PlanLimit;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(36) months?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class PurchaseRequestDto {
  @IsIn(['ADDON', 'PLAN']) type: 'ADDON' | 'PLAN';
  @IsOptional() @Type(() => Number) @IsInt() packId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) units?: number;
  @IsOptional() @Type(() => Number) @IsInt() planId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(36) months?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

class PurchaseQuery extends PaginationDto {
  @IsOptional() @IsIn(Object.values(PurchaseStatus)) status?: PurchaseStatus;
  @IsOptional() @Type(() => Number) @IsInt() storeId?: number;
}
class ConfirmDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @IsString() @MinLength(2) method: string;
  @IsOptional() @IsString() @MaxLength(100) ref?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
class CancelDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
class GrantDto {
  @Type(() => Number) @IsInt() packId: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) units: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() @MaxLength(100) ref?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Chủ cửa hàng: xem gói, hạn mức, mua thêm / đổi gói */
@Controller('admin/subscription')
@StoreOwner()
export class SubscriptionController {
  constructor(private s: BillingService) {}

  @Get() get() { return this.s.subscription(storeId()); }
  @Post('purchases') request(@Body() dto: PurchaseRequestDto, @CurrentUser('sub') me: number) { return this.s.request(storeId(), me, dto); }
  @Post('purchases/:id/cancel') cancel(@Param('id', ParseIntPipe) id: number) { return this.s.cancelMine(storeId(), id); }
}

/** Super admin: bảng giá gói mua thêm & xác nhận đơn mua của cửa hàng */
@Controller('super')
@SuperOnly()
export class SuperBillingController {
  constructor(private s: BillingService) {}

  @Get('addon-packs') packs() { return this.s.listPacks(); }
  @Post('addon-packs') createPack(@Body() dto: PackDto) { return this.s.createPack(dto); }
  @Put('addon-packs/:id') updatePack(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackDto) { return this.s.updatePack(id, dto); }
  @Delete('addon-packs/:id') removePack(@Param('id', ParseIntPipe) id: number) { return this.s.removePack(id); }

  @Get('purchases') purchases(@Query() q: PurchaseQuery) { return this.s.listPurchases(q); }
  @Post('purchases/:id/confirm') confirm(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmDto, @CurrentUser('sub') me: number) {
    return this.s.confirm(id, dto, me);
  }
  @Post('purchases/:id/cancel') cancelPurchase(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelDto, @CurrentUser('sub') me: number) {
    return this.s.cancel(id, dto.note, me);
  }

  @Get('stores/:id/addons') storeAddons(@Param('id', ParseIntPipe) id: number) { return this.s.storeAddons(id); }
  @Post('stores/:id/addons') grant(@Param('id', ParseIntPipe) id: number, @Body() dto: GrantDto, @CurrentUser('sub') me: number) {
    return this.s.grant(id, dto, me);
  }
}

@Module({ imports: [SuperModule], controllers: [SubscriptionController, SuperBillingController], providers: [BillingService], exports: [BillingService] })
export class BillingModule {}
