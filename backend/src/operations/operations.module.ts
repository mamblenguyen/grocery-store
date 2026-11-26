import { Module } from '@nestjs/common';
import { AdminOperationsController, LoyaltyController, ReturnsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { CouponsModule } from '../coupons/coupons.module';

@Module({ imports: [CouponsModule], controllers: [ReturnsController, LoyaltyController, AdminOperationsController], providers: [OperationsService], exports: [OperationsService] })
export class OperationsModule {}
