import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    // ThrottlerGuard chỉ gắn ở từng route nhạy cảm (login/register/coupon validate)
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    PrismaModule,
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
  ],
})
export class AppModule {}
