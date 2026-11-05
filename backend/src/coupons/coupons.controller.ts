import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { AdminOnly } from '../common/decorators';
import { SaveCouponDto, ValidateCouponDto } from './coupons.dto';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private service: CouponsService) {}

  @Post('validate') async validate(@Body() dto: ValidateCouponDto) {
    const { coupon, discount } = await this.service.apply(dto.code, dto.subtotal);
    return { code: coupon.code, description: coupon.description, discount };
  }
}

@Controller('admin/coupons')
@AdminOnly()
export class AdminCouponsController {
  constructor(private service: CouponsService) {}

  @Get() list() {
    return this.service.list();
  }

  @Post() create(@Body() dto: SaveCouponDto) {
    return this.service.create(dto);
  }

  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveCouponDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
