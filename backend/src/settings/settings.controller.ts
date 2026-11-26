import { Body, Controller, Get, Put } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Matches } from 'class-validator';
import { SuperOnly } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

const HEX = /^#[0-9a-fA-F]{6}$/;
const KEY = 'theme';
/** Trùng màu gốc trong frontend/src/app/globals.css (brand-600, accent-500, ink) */
export const DEFAULT_THEME = { primary: '#0a9c4b', accent: '#f97316', sidebar: '#0f172a' };

export class UpdateThemeDto {
  @Matches(HEX, { message: 'Màu chủ đạo phải dạng #RRGGBB' }) primary: string;
  @Matches(HEX, { message: 'Màu nhấn phải dạng #RRGGBB' }) accent: string;
  @Matches(HEX, { message: 'Màu thanh bên phải dạng #RRGGBB' }) sidebar: string;
}

/** Màu giao diện toàn sàn – lưu bảng PlatformSetting (key "theme"), chỉ super admin được đổi */
@Controller()
export class ThemeController {
  constructor(private prisma: PrismaService) {}

  /** Public: giao diện cần màu để render */
  @Get('settings/theme') async get() {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: KEY } }).catch(() => null);
    return { ...DEFAULT_THEME, ...((row?.value as object) ?? {}) };
  }

  @Put('super/settings/theme') @SuperOnly() async update(@Body() dto: UpdateThemeDto) {
    const value = { primary: dto.primary, accent: dto.accent, sidebar: dto.sidebar };
    await this.prisma.platformSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: value as Prisma.InputJsonObject },
      update: { value: value as Prisma.InputJsonObject },
    });
    return value;
  }
}
