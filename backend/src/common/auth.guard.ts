import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './decorators';
import { isExpired, tenant } from './tenant';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

const STORE_ROLES: Role[] = ['ADMIN', 'STAFF'];
const storeSelect = { id: true, slug: true, name: true, status: true, planExpiresAt: true } as const;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Vui lòng đăng nhập');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, storeId: true, store: { select: storeSelect } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    req.user = { sub: user.id, email: user.email, role: user.role, storeId: user.storeId };

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    const t = tenant();
    const isAdminRoute = String(req.path ?? req.url).includes('/admin/');
    const needsStoreRole = roles.some((r) => STORE_ROLES.includes(r));

    if (STORE_ROLES.includes(user.role)) {
      // Nhân viên: LUÔN dùng cửa hàng của tài khoản, bỏ qua mọi header → không truy cập được cửa hàng khác
      // (trang mua hàng của cửa hàng khác – có header X-Store – thì nhân viên mua như khách bình thường)
      if (!user.store) throw new ForbiddenException('Tài khoản chưa được gán cửa hàng');
      if (isAdminRoute || needsStoreRole || !t.storeId) {
        t.storeId = user.store.id;
        t.store = user.store;
        t.storeError = undefined;
      }
      if (isAdminRoute) {
        if (user.store.status !== 'ACTIVE') throw new ForbiddenException('Cửa hàng đang bị khoá. Vui lòng liên hệ quản trị nền tảng.');
        if (isExpired(user.store) && req.method !== 'GET')
          throw new HttpException('Gói dịch vụ đã hết hạn – cửa hàng chỉ được xem dữ liệu. Vui lòng gia hạn để tiếp tục.', HttpStatus.PAYMENT_REQUIRED);
      }
    } else if (user.role === 'SUPER_ADMIN') {
      // Super admin quản trị hộ cửa hàng qua header X-Store-Id (không bị giới hạn bởi trạng thái / hạn gói)
      const rawActing = String(req.headers['x-store-id'] ?? '');
      if (rawActing === 'all' && (isAdminRoute || needsStoreRole)) {
        // Xem dữ liệu của tất cả đối tác
        t.allStores = true;
        t.storeId = undefined;
        t.store = undefined;
        t.storeError = undefined;
        return true;
      }
      const acting = Number(rawActing);
      if (acting && (isAdminRoute || needsStoreRole || !t.storeId)) {
        const store = await this.prisma.store.findUnique({ where: { id: acting }, select: storeSelect });
        if (!store) throw new BadRequestException('Cửa hàng không tồn tại');
        t.storeId = store.id;
        t.store = store;
        t.storeError = undefined;
      }
      if (needsStoreRole && !roles.includes('SUPER_ADMIN')) {
        if (!t.storeId) throw new BadRequestException('Super admin cần chọn cửa hàng để quản trị (header X-Store-Id)');
        return true;
      }
    }

    if (roles.length && !roles.includes(user.role)) throw new ForbiddenException('Bạn không có quyền truy cập');
    return true;
  }
}
