import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Kiểm tra giới hạn của gói dịch vụ trước khi tạo thêm sản phẩm / nhân viên */
export async function assertPlanLimit(prisma: PrismaService, storeId: number, kind: 'products' | 'staff') {
  const store = await prisma.store.findUnique({ where: { id: storeId }, include: { plan: true } });
  const plan = store?.plan;
  const max = kind === 'products' ? plan?.maxProducts : plan?.maxStaff;
  if (!plan || max == null) return;
  const used = kind === 'products'
    ? await prisma.product.count({ where: { storeId } })
    // nhân viên = tài khoản thuộc cửa hàng, không tính 1 chủ cửa hàng
    : Math.max(0, (await prisma.user.count({ where: { storeId } })) - 1);
  if (used >= max)
    throw new ForbiddenException(`Gói "${plan.name}" cho phép tối đa ${max} ${kind === 'products' ? 'sản phẩm' : 'nhân viên'}. Vui lòng nâng cấp gói dịch vụ.`);
}
