import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { tenant } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

const ACTION: Record<string, string> = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (!ACTION[req.method] || !req.user) return next.handle();
    const started = Date.now();
    return next.handle().pipe(tap((result) => {
      const cleanBody = { ...(req.body ?? {}) };
      for (const key of ['password', 'token', 'secret']) if (key in cleanBody) cleanBody[key] = '[REDACTED]';
      // Hồ sơ đối tác chứa CCCD, tài khoản ngân hàng, hợp đồng… → không sao chép dữ liệu cá nhân vào nhật ký (nguyên tắc tối thiểu hoá dữ liệu)
      const sensitive = /\/(partner|partner-applications)(\/|$)/.test(String(req.path ?? ''));
      if (sensitive) {
        for (const k of Object.keys(cleanBody)) cleanBody[k] = '[REDACTED]';
        result = result && typeof result === 'object' ? { id: (result as { id?: unknown }).id ?? null, status: (result as { status?: unknown }).status ?? null } : result;
      }
      const parts = String(req.path ?? '').split('/').filter(Boolean);
      const entity = parts.find((p: string) => !['api', 'admin', 'my', 'super'].includes(p) && !/^\d+$/.test(p)) ?? 'unknown';
      const entityId = parts.find((p: string) => /^\d+$/.test(p));
      this.prisma.auditLog.create({ data: {
        storeId: tenant().storeId ?? req.user.storeId ?? null, userId: req.user.sub, userEmail: req.user.email,
        action: ACTION[req.method], entity, entityId, method: req.method, path: String(req.originalUrl ?? req.url).slice(0, 191),
        ip: req.ip, userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
        afterData: (result && typeof result === 'object' ? result : { result }) as Prisma.InputJsonValue,
        metadata: { body: cleanBody, durationMs: Date.now() - started } as Prisma.InputJsonValue,
      } }).catch(() => {});
    }));
  }
}
