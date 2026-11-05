import { Body, Controller, Get, Module, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { DeliveryStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { AdminOnly, Auth, CurrentUser, SuperOnly } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { OrdersModule } from '../orders/orders.module';
import { ShipperService } from './shipper.service';

const VEHICLES = ['XE_MAY', 'XE_DAP', 'O_TO'];

class LocationDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng: number;
}
class UpdateMeDto {
  @IsOptional() @IsBoolean() isOnline?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsIn(VEHICLES) vehicleType?: string;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() area?: string;
}
class JobsQuery {
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) radiusKm?: number;
}
class MineQuery extends PaginationDto {
  @IsOptional() @IsIn(['active', 'history']) status?: 'active' | 'history';
}
class FailDto { @IsString() @MinLength(3, { message: 'Nhập lý do (tối thiểu 3 ký tự)' }) reason: string }
class CreateShipperDto {
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) password: string;
  @IsString() @MinLength(2) fullName: string;
  @IsString() @MinLength(9, { message: 'Nhập số điện thoại tài xế' }) phone: string;
  @IsOptional() @IsIn(VEHICLES) vehicleType?: string;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() idNumber?: string;
  @IsOptional() @IsString() area?: string;
}
class UpdateShipperDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(VEHICLES) vehicleType?: string;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() idNumber?: string;
  @IsOptional() @IsString() area?: string;
}
class DeliveriesQuery extends PaginationDto {
  @IsOptional() @IsIn(Object.values(DeliveryStatus)) status?: DeliveryStatus;
  @IsOptional() @Type(() => Number) @IsNumber() shipperId?: number;
}

/** Ứng dụng tài xế (giống tài xế Grab): bật nhận đơn, xem đơn gần, nhận – lấy – giao */
@Controller('shipper')
@Auth(Role.SHIPPER)
export class ShipperController {
  constructor(private s: ShipperService) {}
  @Get('me') me(@CurrentUser('sub') me: number) { return this.s.me(me); }
  @Patch('me') updateMe(@CurrentUser('sub') me: number, @Body() dto: UpdateMeDto) { return this.s.updateMe(me, dto); }
  @Post('location') location(@CurrentUser('sub') me: number, @Body() dto: LocationDto) { return this.s.location(me, dto.lat, dto.lng); }
  @Get('jobs') jobs(@CurrentUser('sub') me: number, @Query() q: JobsQuery) { return this.s.jobs(me, q); }
  @Post('jobs/:id/accept') accept(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number) { return this.s.accept(me, id); }
  @Get('deliveries') mine(@CurrentUser('sub') me: number, @Query() q: MineQuery) { return this.s.mine(me, q); }
  @Get('deliveries/:id') detail(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number) { return this.s.detail(me, id); }
  @Post('deliveries/:id/pickup') pickup(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number) { return this.s.pickup(me, id); }
  @Post('deliveries/:id/complete') complete(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number) { return this.s.complete(me, id); }
  @Post('deliveries/:id/fail') fail(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number, @Body() dto: FailDto) { return this.s.fail(me, id, dto.reason); }
  @Post('deliveries/:id/release') release(@CurrentUser('sub') me: number, @Param('id', ParseIntPipe) id: number) { return this.s.release(me, id); }
}

/** Cửa hàng gọi / huỷ tài xế cho đơn */
@Controller('admin/orders/:id/delivery')
@AdminOnly()
export class StoreDeliveryController {
  constructor(private s: ShipperService) {}
  @Post('request') request(@Param('id', ParseIntPipe) id: number) { return this.s.storeRequest(id); }
  @Post('cancel') cancel(@Param('id', ParseIntPipe) id: number) { return this.s.storeCancel(id); }
}

/** Super admin quản lý đội tài xế */
@Controller('super')
@SuperOnly()
export class SuperShipperController {
  constructor(private s: ShipperService) {}
  @Get('shippers') list(@Query() q: PaginationDto) { return this.s.listShippers(q); }
  @Post('shippers') create(@Body() dto: CreateShipperDto) { return this.s.createShipper(dto); }
  @Patch('shippers/:id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShipperDto) { return this.s.updateShipper(id, dto); }
  @Get('deliveries') deliveries(@Query() q: DeliveriesQuery) { return this.s.deliveries(q); }
}

@Module({ imports: [OrdersModule], controllers: [ShipperController, StoreDeliveryController, SuperShipperController], providers: [ShipperService] })
export class DeliveryModule {}
