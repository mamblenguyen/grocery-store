import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MailModule } from './mail/mail.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { InventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadModule } from './upload/upload.module';
import { HealthController } from './health.controller';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressesModule } from './addresses/addresses.module';
import { StockModule } from './stock/stock.module';
import { SuperModule } from './super/super.module';
import { StoresModule } from './stores/stores.module';
import { MarketModule } from './market/market.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [
    // Giới hạn chung 1000 request/phút/IP; các API đăng nhập có giới hạn riêng chặt hơn
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    PrismaModule,
    MailModule,
    NotificationsModule,
    ReportsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    CouponsModule,
    InventoryModule,
    DashboardModule,
    UploadModule,
    SettingsModule,
    PaymentsModule,
    ReviewsModule,
    WishlistModule,
    AddressesModule,
    StockModule,
    SuperModule,
    StoresModule,
    MarketModule,
    DeliveryModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
