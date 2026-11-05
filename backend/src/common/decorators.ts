import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from './auth.guard';

export const ROLES_KEY = 'roles';

/** Yêu cầu đăng nhập; nếu truyền roles thì chỉ các role đó được truy cập */
export const Auth = (...roles: Role[]) => applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(AuthGuard));

/** Quản trị: ADMIN + STAFF */
export const AdminOnly = () => Auth(Role.ADMIN, Role.STAFF);

export const CurrentUser = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user;
  return field ? user?.[field] : user;
});
