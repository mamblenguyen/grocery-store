import { Body, Controller, Get, Global, Module, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../common/decorators';
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
@Auth(Role.ADMIN)
export class AdminSettingsController {
  constructor(private settings: SettingsService) {}

  @Get() get() {
    return this.settings.getAdmin();
  }

  /** Cập nhật một phần cài đặt (body là object con của StoreSettings) */
  @Put() update(@Body() body: Partial<StoreSettings>) {
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
