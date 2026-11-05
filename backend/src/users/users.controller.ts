import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminOnly, CurrentUser, StoreOwner } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { UsersService } from './users.service';

class CreateStaffDto {
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password: string;
  @IsString() @MinLength(2) fullName: string;
  @IsOptional() @IsString() phone?: string;
  @IsIn(['ADMIN', 'STAFF']) role: Role;
}

class UpdateStaffDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['ADMIN', 'STAFF']) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}

/** Nhân viên của cửa hàng – chỉ chủ / quản lý */
@Controller('admin/staff')
@StoreOwner()
export class StaffController {
  constructor(private users: UsersService) {}

  @Get() list() {
    return this.users.listStaff();
  }

  @Post() create(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffDto, @CurrentUser('sub') me: number) {
    return this.users.updateStaff(id, dto, me);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') me: number) {
    return this.users.removeStaff(id, me);
  }
}

/** Khách hàng đã mua tại cửa hàng */
@Controller('admin/customers')
@AdminOnly()
export class CustomersController {
  constructor(private users: UsersService) {}

  @Get() list(@Query() q: PaginationDto) {
    return this.users.listCustomers(q);
  }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) {
    return this.users.customerDetail(id);
  }
}

/** Gói dịch vụ đang dùng, mức sử dụng & lịch sử thanh toán phí nền tảng */
@Controller('admin/subscription')
@StoreOwner()
export class SubscriptionController {
  constructor(private users: UsersService) {}

  @Get() get() {
    return this.users.subscription();
  }
}
