import { Module } from '@nestjs/common';
import { CustomersController, StaffController, SubscriptionController } from './users.controller';
import { UsersService } from './users.service';

@Module({ controllers: [StaffController, CustomersController, SubscriptionController], providers: [UsersService] })
export class UsersModule {}
