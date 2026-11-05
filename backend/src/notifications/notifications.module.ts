import {
  Body, Controller, Delete, Get, Global, Injectable, Logger, Module, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { Auth, CurrentUser } from '../common/decorators';
import { PaginationDto } from '../common/pagination.dto';
import { paged, paginate } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyInput {
  type: 'ORDER_STATUS' | 'PAYMENT' | 'NEW_ORDER' | 'SYSTEM';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly log = new Logger('Notify');
  constructor(private prisma: PrismaService) {}

  /** Lưu thông báo + gửi push tới các thiết bị đã đăng ký (không chặn luồng chính) */
  async notify(userIds: number[], n: NotifyInput) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return;
    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, data: (n.data ?? {}) as Prisma.InputJsonValue })),
    });
    const tokens = await this.prisma.pushToken.findMany({ where: { userId: { in: ids } }, select: { token: true } });
    if (tokens.length) this.sendPush(tokens.map((t) => t.token), n).catch((e) => this.log.warn(`Push lỗi: ${e.message}`));
  }

  async notifyStaff(n: NotifyInput) {
    const staff = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'STAFF'] }, isActive: true }, select: { id: true } });
    return this.notify(staff.map((s) => s.id), n);
  }

  /** Expo Push API – https://docs.expo.dev/push-notifications/sending-notifications/ */
  private async sendPush(tokens: string[], n: NotifyInput) {
    const valid = tokens.filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t));
    for (let i = 0; i < valid.length; i += 100) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(valid.slice(i, i + 100).map((to) => ({ to, title: n.title, body: n.body, data: n.data ?? {}, sound: 'default' }))),
      });
      const json: any = await res.json().catch(() => null);
      // Token không còn hợp lệ → xoá
      const dead = (json?.data ?? []).map((r: any, idx: number) => (r?.details?.error === 'DeviceNotRegistered' ? valid[i + idx] : null)).filter(Boolean);
      if (dead.length) await this.prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }
  }

  async list(userId: number, q: PaginationDto) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...paged(items, total, page, limit), unread };
  }

  unreadCount(userId: number) {
    return this.prisma.notification.count({ where: { userId, readAt: null } }).then((unread) => ({ unread }));
  }

  markRead(userId: number, id: number) {
    return this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  }

  markAllRead(userId: number) {
    return this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }

  async registerToken(userId: number, token: string, platform?: string) {
    await this.prisma.pushToken.upsert({ where: { token }, create: { userId, token, platform }, update: { userId, platform } });
    return { success: true };
  }

  async removeToken(userId: number, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
    return { success: true };
  }
}

class PushTokenDto {
  @IsString() token: string;
  @IsOptional() @IsString() platform?: string;
}

@Controller('notifications')
@Auth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get() list(@CurrentUser('sub') userId: number, @Query() q: PaginationDto) {
    return this.service.list(userId, q);
  }

  @Get('unread-count') unread(@CurrentUser('sub') userId: number) {
    return this.service.unreadCount(userId);
  }

  @Patch('read-all') readAll(@CurrentUser('sub') userId: number) {
    return this.service.markAllRead(userId);
  }

  @Patch(':id/read') read(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(userId, id);
  }

  @Post('push-token') register(@CurrentUser('sub') userId: number, @Body() dto: PushTokenDto) {
    return this.service.registerToken(userId, dto.token, dto.platform);
  }

  @Delete('push-token') unregister(@CurrentUser('sub') userId: number, @Body() dto: PushTokenDto) {
    return this.service.removeToken(userId, dto.token);
  }
}

@Global()
@Module({ controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
