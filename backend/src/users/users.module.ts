import { Module } from '@nestjs/common';
import { CustomersController, StaffController } from './users.controller';
import { UsersService } from './users.service';

@Module({ controllers: [StaffController, CustomersController], providers: [UsersService] })
export class UsersModule {}
