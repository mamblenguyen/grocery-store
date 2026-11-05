import { Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { AdminOrdersController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryCoreService } from '../delivery/delivery-core.service';

@Module({ imports: [CouponsModule], controllers: [OrdersController, AdminOrdersController], providers: [OrdersService, DeliveryCoreService], exports: [OrdersService, DeliveryCoreService] })
export class OrdersModule {}
