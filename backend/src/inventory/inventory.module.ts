import { Module } from '@nestjs/common';
import { InventoryController, InventoryService } from './inventory.controller';

@Module({ controllers: [InventoryController], providers: [InventoryService] })
export class InventoryModule {}
