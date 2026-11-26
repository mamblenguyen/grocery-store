import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Matches } from 'class-validator';
import { Auth } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_THEME = { primary: '#059669', accent: '#ef4444', sidebar: '#111827' };

export class UpdateThemeDto {
  @Matches(HEX, { message: 'Màu chủ đạo phải dạng #RRGGBB' }) primary: string;
  @Matches(HEX, { message: 'Màu nhấn phải dạng #RRGGBB' }) accent: string;
  @Matches(HEX, { message: 'Màu thanh bên phải dạng #RRGGBB' }) sidebar: string;
}

@Controller()
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  /** Public: giao diện cửa hàng cần màu để render */
  @Get('settings/theme') async get() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'theme' } });
    return { ...DEFAULT_THEME, ...((row?.value as object) ?? {}) };
  }

  /** Chỉ ADMIN (super admin) được đổi */
  @Put('admin/settings/theme') @Auth(Role.ADMIN) async update(@Body() dto: UpdateThemeDto) {
    const value = { primary: dto.primary, accent: dto.accent, sidebar: dto.sidebar };
    await this.prisma.setting.upsert({ where: { key: 'theme' }, create: { key: 'theme', value }, update: { value } });
    return value;
  }
}
