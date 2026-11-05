import { Body, Controller, Delete, Get, Module, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Role, StoreStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { CurrentUser, SuperOnly } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { SuperService } from './super.service';

class PlanDto {
  @IsOptional() @IsString() code?: string;
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsInt() @Min(0) priceMonthly: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() @Min(1) maxProducts?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() @Min(0) maxStaff?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class UpdatePlanDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceMonthly?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() @Min(1) maxProducts?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() @Min(0) maxStaff?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class OwnerDto {
  @IsEmail({}, { message: 'Email chủ cửa hàng không hợp lệ' }) email: string;
  @IsOptional() @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password?: string;
  @IsString() @MinLength(2, { message: 'Nhập họ tên chủ cửa hàng' }) fullName: string;
  @IsOptional() @IsString() phone?: string;
}

class CreateStoreDto {
  @IsString() @MinLength(2, { message: 'Nhập tên cửa hàng' }) name: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @Type(() => Number) @IsInt() planId?: number;
  /** 0 = không thời hạn */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) months?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @IsOptional() @IsString() method?: string;
  @ValidateNested() @Type(() => OwnerDto) owner: OwnerDto;
}

class UpdateStoreDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(Object.values(StoreStatus)) status?: StoreStatus;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() planId?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() planExpiresAt?: string | null;
}

class RenewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(60) months: number;
  @IsOptional() @Type(() => Number) @IsInt() planId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) amount?: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() note?: string;
}

class MemberDto {
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password: string;
  @IsString() @MinLength(2) fullName: string;
  @IsOptional() @IsString() phone?: string;
  @IsIn(['ADMIN', 'STAFF']) role: Role;
}

class UpdateMemberDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['ADMIN', 'STAFF']) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password?: string;
}

class StoreQuery extends PaginationDto {
  @IsOptional() @IsIn(Object.values(StoreStatus)) status?: StoreStatus;
  @IsOptional() @Type(() => Number) @IsInt() planId?: number;
  @IsOptional() @IsIn(['expired', 'soon']) expiry?: 'expired' | 'soon';
}

class PaymentQuery extends PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() storeId?: number;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

class UserQuery extends PaginationDto {
  @IsOptional() @IsIn(Object.values(Role)) role?: Role;
}

class UpdateUserDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password?: string;
}

/** Quản trị nền tảng – chỉ SUPER_ADMIN */
@Controller('super')
@SuperOnly()
export class SuperController {
  constructor(private s: SuperService) {}

  @Get('dashboard') dashboard() { return this.s.dashboard(); }

  @Get('plans') plans() { return this.s.listPlans(); }
  @Post('plans') createPlan(@Body() dto: PlanDto) { return this.s.createPlan(dto as any); }
  @Put('plans/:id') updatePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) { return this.s.updatePlan(id, dto as any); }
  @Delete('plans/:id') removePlan(@Param('id', ParseIntPipe) id: number) { return this.s.removePlan(id); }

  @Get('stores') stores(@Query() q: StoreQuery) { return this.s.listStores(q); }
  @Post('stores') createStore(@Body() dto: CreateStoreDto, @CurrentUser('sub') me: number) { return this.s.createStore(dto, me); }
  @Get('stores/:id') store(@Param('id', ParseIntPipe) id: number) { return this.s.storeDetail(id); }
  @Patch('stores/:id') updateStore(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoreDto) { return this.s.updateStore(id, dto); }
  @Post('stores/:id/renew') renew(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewDto, @CurrentUser('sub') me: number) {
    return this.s.renew(id, dto, me);
  }
  @Post('stores/:id/members') addMember(@Param('id', ParseIntPipe) id: number, @Body() dto: MemberDto) { return this.s.addMember(id, dto); }
  @Patch('stores/:id/members/:userId') updateMember(
    @Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number, @Body() dto: UpdateMemberDto,
  ) { return this.s.updateMember(id, userId, dto); }
  @Delete('stores/:id/members/:userId') removeMember(@Param('id', ParseIntPipe) id: number, @Param('userId', ParseIntPipe) userId: number) {
    return this.s.removeMember(id, userId);
  }

  @Get('payments') payments(@Query() q: PaymentQuery) { return this.s.payments(q); }
  @Delete('payments/:id') removePayment(@Param('id', ParseIntPipe) id: number) { return this.s.removePayment(id); }

  @Get('users') users(@Query() q: UserQuery) { return this.s.users(q); }
  @Patch('users/:id') updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser('sub') me: number) {
    return this.s.updateUser(id, dto, me);
  }
}

@Module({ controllers: [SuperController], providers: [SuperService] })
export class SuperModule {}
