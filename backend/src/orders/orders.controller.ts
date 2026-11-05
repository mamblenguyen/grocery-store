import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdminOnly, Auth, CurrentUser } from '../common/decorators';
import {
  CancelOrderDto, CreateOrderDto, PreviewOrderDto, QueryOrdersDto, UpdatePaymentDto, UpdateStatusDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  /** Tính tiền giỏ hàng (không cần đăng nhập) */
  @Post('preview') preview(@Body() dto: PreviewOrderDto) {
    return this.service.preview(dto);
  }

  @Auth() @Post() create(@Body() dto: CreateOrderDto, @CurrentUser('sub') userId: number) {
    return this.service.create(dto, userId);
  }

  @Auth() @Get('my') mine(@CurrentUser('sub') userId: number, @Query() q: QueryOrdersDto) {
    return this.service.listMine(userId, q);
  }

  @Auth() @Get('my/:id') myDetail(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: number) {
    return this.service.findOne(id, userId);
  }

  @Auth() @Patch('my/:id/cancel') cancel(
    @Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: number, @Body() dto: CancelOrderDto,
  ) {
    return this.service.cancelMine(id, userId, dto.reason);
  }
}

@Controller('admin/orders')
@AdminOnly()
export class AdminOrdersController {
  constructor(private service: OrdersService) {}

  @Get() list(@Query() q: QueryOrdersDto) {
    return this.service.listAll(q);
  }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/status') status(
    @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto, @CurrentUser('sub') actor: number,
  ) {
    return this.service.updateStatus(id, dto.status, actor, dto.cancelReason);
  }

  @Patch(':id/payment') payment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentDto) {
    return this.service.updatePayment(id, dto.paymentStatus);
  }
}
