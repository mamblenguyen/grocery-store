import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { storeId } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCouponDto } from './coupons.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ where: { storeId: storeId() }, include: { recipients: { include: { user: { select: { id: true, fullName: true, email: true, phone: true } } } } }, orderBy: { createdAt: 'desc' } });
  }

  private normalize(dto: SaveCouponDto) {
    if (dto.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('Phần trăm giảm tối đa 100');
    const { recipientIds, ...data } = dto;
    return { ...data, code: dto.code.trim().toUpperCase() };
  }

  private async validRecipients(ids: number[]) {
    if (!ids.length) return [];
    const uniqueIds = [...new Set(ids)];
    const users = await this.prisma.user.findMany({ where: { id: { in: uniqueIds }, orders: { some: { storeId: storeId() } } }, select: { id: true } });
    if (users.length !== uniqueIds.length) throw new BadRequestException('Danh sách có khách hàng không thuộc cửa hàng này');
    return users.map((x) => x.id);
  }

  async create(dto: SaveCouponDto) {
    const ids = dto.audienceAll ? [] : await this.validRecipients(dto.recipientIds ?? []);
    if (!dto.audienceAll && !ids.length) throw new BadRequestException('Vui lòng chọn ít nhất một khách hàng');
    return this.prisma.coupon.create({ data: { ...this.normalize(dto), storeId: storeId(), recipients: { create: ids.map((userId) => ({ userId })) } }, include: { recipients: true } });
  }

  async update(id: number, dto: SaveCouponDto) {
    await this.prisma.coupon.findFirstOrThrow({ where: { id, storeId: storeId() } });
    const ids = dto.audienceAll ? [] : await this.validRecipients(dto.recipientIds ?? []);
    if (!dto.audienceAll && !ids.length) throw new BadRequestException('Vui lòng chọn ít nhất một khách hàng');
    return this.prisma.$transaction(async (tx) => {
      await tx.couponRecipient.deleteMany({ where: { couponId: id } });
      return tx.coupon.update({ where: { id }, data: { ...this.normalize(dto), recipients: { create: ids.map((userId) => ({ userId })) } }, include: { recipients: true } });
    });
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
  async apply(code: string, subtotal: number, tx: Prisma.TransactionClient = this.prisma, userId?: number | null) {
    const c = await tx.coupon.findUnique({ where: { storeId_code: { storeId: storeId(), code: code.trim().toUpperCase() } } });
    const now = new Date();
    if (c && !c.audienceAll) {
      if (!userId) throw new BadRequestException('Mã giảm giá này chỉ dành cho khách hàng được chỉ định');
      const assigned = await tx.couponRecipient.findUnique({ where: { couponId_userId: { couponId: c.id, userId } } });
      if (!assigned) throw new BadRequestException('Mã giảm giá không được gán cho tài khoản của bạn');
      const used = await tx.couponRedemption.findUnique({ where: { couponId_userId: { couponId: c.id, userId } } });
      if (used) throw new BadRequestException('Voucher này đã được sử dụng');
    }
    if (!c || !c.isActive) throw new BadRequestException('Mã giảm giá không tồn tại hoặc đã ngừng');
    if (c.startsAt && c.startsAt > now) throw new BadRequestException('Mã giảm giá chưa đến thời gian áp dụng');
    if (c.endsAt && c.endsAt < now) throw new BadRequestException('Mã giảm giá đã hết hạn');
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    if (subtotal < c.minOrderValue)
      throw new BadRequestException(`Đơn hàng tối thiểu ${c.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này`);
    return { coupon: c, discount: this.calcDiscount(c, subtotal) };
  }
}
