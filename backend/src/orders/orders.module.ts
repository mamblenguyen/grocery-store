import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({ imports: [CouponsModule], controllers: [OrdersController, AdminOrdersController], providers: [OrdersService] })
export class OrdersModule {}
