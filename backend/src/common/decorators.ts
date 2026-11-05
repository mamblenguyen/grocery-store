import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from './auth.guard';

export const ROLES_KEY = 'roles';

/** Yêu cầu đăng nhập; nếu truyền roles thì chỉ các role đó được truy cập */
export const Auth = (...roles: Role[]) => applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(AuthGuard));

/** Quản trị cửa hàng: ADMIN + STAFF (super admin được phép khi đang quản trị hộ 1 cửa hàng) */
export const AdminOnly = () => Auth(Role.ADMIN, Role.STAFF);

/** Chỉ chủ / quản lý cửa hàng (super admin được phép khi quản trị hộ) */
export const StoreOwner = () => Auth(Role.ADMIN);

/** Chỉ quản trị nền tảng */
export const SuperOnly = () => Auth(Role.SUPER_ADMIN);

export const CurrentUser = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  return field ? user?.[field] : user;
});
