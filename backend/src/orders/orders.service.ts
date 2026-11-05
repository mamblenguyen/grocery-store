import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { paged, paginate } from '../common/utils';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, PreviewOrderDto, QueryOrdersDto } from './dto/order.dto';

const SHIPPING_FEE = Number(process.env.SHIPPING_FEE ?? 20000);
const FREE_SHIP = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 300000);

/** Luồng trạng thái hợp lệ */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const orderInclude = {
  items: true,
  user: { select: { id: true, email: true, fullName: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private coupons: CouponsService) {}

  private genCode() {
    const d = new Date();
    const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `DH${ymd}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  /** Tính giá đơn hàng (dùng chung cho xem trước & đặt hàng) */
  private async calculate(dto: PreviewOrderDto, tx: Prisma.TransactionClient = this.prisma) {
    const merged = new Map<number, number>();
    dto.items.forEach((i) => merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity));
    const variants = await tx.productVariant.findMany({
      where: { id: { in: [...merged.keys()] } },
      include: { product: { select: { id: true, name: true, thumbnail: true, isActive: true } } },
    });
    const lines = [...merged.entries()].map(([variantId, quantity]) => {
      const v = variants.find((x) => x.id === variantId);
      if (!v || !v.isActive || !v.product.isActive) throw new BadRequestException(`Sản phẩm (#${variantId}) không còn bán`);
      if (v.stock < quantity)
        throw new BadRequestException(`"${v.product.name} - ${v.name}" chỉ còn ${v.stock} sản phẩm`);
      return {
        variantId, quantity, productId: v.product.id, productName: v.product.name, variantName: v.name,
        sku: v.sku, image: v.image || v.product.thumbnail, price: v.price, total: v.price * quantity,
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    if (dto.couponCode) {
      const r = await this.coupons.apply(dto.couponCode, subtotal, tx);
      discount = r.discount;
      couponCode = r.coupon.code;
      couponId = r.coupon.id;
    }
    const shippingFee = subtotal >= FREE_SHIP ? 0 : SHIPPING_FEE;
    return { lines, subtotal, discount, shippingFee, total: subtotal - discount + shippingFee, couponCode, couponId };
  }

  async preview(dto: PreviewOrderDto) {
    const { couponId, ...rest } = await this.calculate(dto);
    return { ...rest, freeShippingThreshold: FREE_SHIP };
  }

  async create(dto: CreateOrderDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const calc = await this.calculate(dto, tx);
      // Trừ kho có điều kiện để tránh bán quá số lượng khi nhiều người đặt cùng lúc
      for (const l of calc.lines) {
        const r = await tx.productVariant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (r.count === 0) throw new BadRequestException(`"${l.productName} - ${l.variantName}" không đủ hàng`);
      }
      if (calc.couponId) await tx.coupon.update({ where: { id: calc.couponId }, data: { usedCount: { increment: 1 } } });

      const order = await tx.order.create({
        data: {
          code: this.genCode(), userId,
          customerName: dto.customerName, phone: dto.phone, address: dto.address, note: dto.note,
          paymentMethod: dto.paymentMethod ?? 'COD',
          subtotal: calc.subtotal, discount: calc.discount, shippingFee: calc.shippingFee, total: calc.total,
          couponCode: calc.couponCode,
          items: { create: calc.lines },
        },
        include: orderInclude,
      });
      for (const l of calc.lines) {
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: l.variantId }, select: { stock: true } });
        await tx.inventoryLog.create({
          data: { variantId: l.variantId, change: -l.quantity, stockAfter: v.stock, reason: 'ORDER', note: `Đơn ${order.code}`, userId },
        });
      }
      return order;
    });
  }

  private async listWhere(q: QueryOrdersDto, extra: Prisma.OrderWhereInput = {}) {
    const { skip, take, page, limit } = paginate(q.page, q.limit);
    const where: Prisma.OrderWhereInput = {
      ...extra,
      ...(q.status && { status: q.status }),
      ...((q.from || q.to) && {
        createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to + 'T23:59:59') }) },
      }),
      ...(q.search && {
        OR: [
          { code: { contains: q.search, mode: 'insensitive' } },
          { customerName: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } }, user: { select: { id: true, email: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paged(items, total, page, limit);
  }

  listMine(userId: number, q: QueryOrdersDto) {
    return this.listWhere(q, { userId });
  }

  listAll(q: QueryOrdersDto) {
    return this.listWhere(q);
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (userId !== undefined && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(id: number, status: OrderStatus, actorId: number, cancelReason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (!TRANSITIONS[order.status].includes(status))
        throw new BadRequestException(`Không thể chuyển trạng thái từ ${order.status} sang ${status}`);

      const data: Prisma.OrderUpdateInput = { status };
      if (status === 'CANCELLED') {
        data.cancelReason = cancelReason ?? null;
        if (order.paymentStatus === 'PAID') data.paymentStatus = 'REFUNDED';
        // Hoàn kho
        for (const it of order.items) {
          if (!it.variantId) continue;
          const v = await tx.productVariant.update({
            where: { id: it.variantId }, data: { stock: { increment: it.quantity } }, select: { stock: true },
          }).catch(() => null);
          if (v) await tx.inventoryLog.create({
            data: { variantId: it.variantId, change: it.quantity, stockAfter: v.stock, reason: 'CANCEL', note: `Huỷ đơn ${order.code}`, userId: actorId },
          });
        }
        if (order.couponCode)
          await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      if (status === 'COMPLETED') {
        data.paymentStatus = 'PAID';
        for (const it of order.items) {
          if (it.productId)
            await tx.product.updateMany({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
        }
      }
      return tx.order.update({ where: { id }, data, include: orderInclude });
    });
  }

  async cancelMine(id: number, userId: number, reason?: string) {
    const order = await this.findOne(id, userId);
    if (order.status !== 'PENDING') throw new BadRequestException('Chỉ có thể huỷ đơn đang chờ xác nhận');
    return this.updateStatus(id, 'CANCELLED', userId, reason || 'Khách hàng huỷ');
  }

  updatePayment(id: number, paymentStatus: PaymentStatus) {
    return this.prisma.order.update({ where: { id }, data: { paymentStatus }, include: orderInclude });
  }
}
