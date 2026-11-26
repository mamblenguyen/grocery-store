import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StoreInfo, tenantAls, TenantCtx } from './tenant';

const cache = new Map<string, { at: number; store: StoreInfo | null }>();
const TTL = 30_000;

export function clearStoreCache(slug?: string) {
  if (slug) cache.delete(slug);
  else cache.clear();
}

async function findStore(prisma: PrismaService, slug: string) {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL) return hit.store;
  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, status: true, planExpiresAt: true } });
  cache.set(slug, { at: Date.now(), store });
  return store;
}

/** Bọc mỗi request trong ngữ cảnh tenant; nếu có header X-Store (slug) thì xác định cửa hàng cho storefront */
export function tenantMiddleware(prisma: PrismaService) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ctx: TenantCtx = {};
    tenantAls.run(ctx, async () => {
      const slug = String(req.headers['x-store'] ?? req.query.store ?? '').trim().toLowerCase();
      if (slug) {
        try {
          const store = await findStore(prisma, slug);
          if (!store) ctx.storeError = 'Không tìm thấy cửa hàng';
          else if (store.status !== 'ACTIVE') ctx.storeError = 'Cửa hàng đang tạm ngưng hoạt động';
          else { ctx.storeId = store.id; ctx.store = store; }
        } catch {
          ctx.storeError = 'Không xác định được cửa hàng';
        }
      }
      next();
    });
  };
}
