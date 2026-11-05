import { Body, Controller, Get, Global, Module, Put } from '@nestjs/common';
import { AdminOnly, StoreOwner } from '../common/decorators';
import { SettingsService } from './settings.service';
import { StoreSettings } from './settings.types';

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get() get() {
    return this.settings.getPublic();
  }
}

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private settings: SettingsService) {}

  /** Nhân viên cũng cần đọc (in hoá đơn, POS); chỉ chủ cửa hàng được sửa */
  @AdminOnly() @Get() get() {
    return this.settings.getAdmin();
  }

  /** Cập nhật một phần cài đặt (body là object con của StoreSettings) */
  @StoreOwner() @Put() update(@Body() body: Partial<StoreSettings>) {
    return this.settings.update(body);
  }
}

@Global()
@Module({
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
