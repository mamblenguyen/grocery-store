import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { CouponsService } from '../coupons/coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

function setup(couponUpdateCount: number) {
  const calls: { orderCreated: boolean; couponWhere?: unknown } = { orderCreated: false };
  const tx = {
    productVariant: {
      findMany: async () => [
        { id: 1, name: '500g', sku: 'SKU1', image: null, price: 100000, stock: 10, isActive: true,
          product: { id: 1, name: 'Gạo', thumbnail: null, isActive: true } },
      ],
      updateMany: async () => ({ count: 1 }),
    },
    coupon: {
      updateMany: async (args: { where: unknown }) => {
        calls.couponWhere = args.where;
        return { count: couponUpdateCount };
      },
    },
    order: {
      create: async () => {
        calls.orderCreated = true;
        return { id: 1, code: 'DH1' };
      },
    },
  };
  const prisma = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
  const coupons = {
    apply: async () => ({ coupon: { id: 7, code: 'SALE', usageLimit: 5 }, discount: 10000 }),
  } as unknown as CouponsService;
  return { service: new OrdersService(prisma, coupons), calls };
}

const dto = {
  items: [{ variantId: 1, quantity: 1 }], couponCode: 'SALE',
  customerName: 'A', phone: '0900000000', address: 'HN',
} as any;

test('create: throw khi coupon đã hết lượt (updateMany count = 0)', async () => {
  const { service, calls } = setup(0);
  await assert.rejects(service.create(dto, 1), (e: unknown) => {
    assert.ok(e instanceof BadRequestException);
    assert.equal(e.message, 'Mã giảm giá đã hết lượt sử dụng');
    return true;
  });
  assert.deepEqual(calls.couponWhere, { id: 7, OR: [{ usageLimit: null }, { usedCount: { lt: 5 } }] });
  assert.equal(calls.orderCreated, false);
});
