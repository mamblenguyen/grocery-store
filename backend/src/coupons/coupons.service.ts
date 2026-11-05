import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCouponDto } from './coupons.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ where: { storeId: storeId() }, orderBy: { createdAt: 'desc' } });
  }

  private normalize(dto: SaveCouponDto) {
    if (dto.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('Phần trăm giảm tối đa 100');
    return { ...dto, code: dto.code.trim().toUpperCase() };
  }

  create(dto: SaveCouponDto) {
    return this.prisma.coupon.create({ data: { ...this.normalize(dto), storeId: storeId() } });
  }

  async update(id: number, dto: SaveCouponDto) {
    await this.prisma.coupon.findFirstOrThrow({ where: { id, storeId: storeId() } });
    return this.prisma.coupon.update({ where: { id }, data: this.normalize(dto) });
  }

  async remove(id: number) {
    await this.prisma.coupon.findFirstOrThrow({ where: { id, storeId: storeId() } });
    return this.prisma.coupon.delete({ where: { id } });
  }

  calcDiscount(c: Coupon, subtotal: number) {
    let d = c.type === 'PERCENT' ? Math.floor((subtotal * c.value) / 100) : c.value;
    if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
    return Math.min(d, subtotal);
  }

  /** Kiểm tra mã & trả về số tiền giảm. Có thể chạy trong transaction */
  async apply(code: string, subtotal: number, tx: Prisma.TransactionClient = this.prisma) {
    const c = await tx.coupon.findUnique({ where: { storeId_code: { storeId: storeId(), code: code.trim().toUpperCase() } } });
    const now = new Date();
    if (!c || !c.isActive) throw new BadRequestException('Mã giảm giá không tồn tại hoặc đã ngừng');
    if (c.startsAt && c.startsAt > now) throw new BadRequestException('Mã giảm giá chưa đến thời gian áp dụng');
    if (c.endsAt && c.endsAt < now) throw new BadRequestException('Mã giảm giá đã hết hạn');
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    if (subtotal < c.minOrderValue)
      throw new BadRequestException(`Đơn hàng tối thiểu ${c.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này`);
    return { coupon: c, discount: this.calcDiscount(c, subtotal) };
  }
}
