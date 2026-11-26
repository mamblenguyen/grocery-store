import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type { PlatformService } from '../common/platform';
import { defaultTariff } from '../common/shipping';
import { tenantAls } from '../common/tenant';
import type { CouponsService } from '../coupons/coupons.service';
import type { DeliveryCoreService } from '../delivery/delivery-core.service';
import type { NotificationsService } from '../notifications/notifications.module';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import { OrdersService } from './orders.service';

const STORE = { id: 1, slug: 'test', name: 'Test', status: 'ACTIVE' as const, planExpiresAt: null };

function setup(couponUpdateCount: number) {
  const calls: { orderCreated: boolean; couponWhere?: unknown } = { orderCreated: false };
  const tx = {
    productVariant: {
      findMany: async () => [
        { id: 1, name: '500g', sku: 'SKU1', image: null, price: 100000, costPrice: 80000, stock: 10, isActive: true,
          product: { id: 1, name: 'Gạo', slug: 'gao', thumbnail: null, unit: 'túi', isActive: true, vatRate: '5' } },
      ],
      updateMany: async () => ({ count: 1 }),
      findUniqueOrThrow: async () => ({ stock: 9, costPrice: 80000 }),
    },
    inventoryLog: { create: async () => ({}) },
    promotion: { findMany: async () => [], update: async () => ({}) },
    store: { findUnique: async () => ({ lat: null, lng: null }) },
    coupon: {
      findUniqueOrThrow: async () => ({ usageLimit: 5 }),
      updateMany: async (args: { where: unknown }) => {
        calls.couponWhere = args.where;
        return { count: couponUpdateCount };
      },
    },
    order: {
      create: async () => {
        calls.orderCreated = true;
        return { id: 1, code: 'DH1', storeId: 1, customerName: 'A', total: 0, items: [] };
      },
    },
  };
  const prisma = {
    ...tx,
    // assertPlanLimit: cửa hàng không gán gói → không giới hạn
    store: { findUnique: async () => ({ plan: null, lat: null, lng: null }) },
    storePurchase: { groupBy: async () => [] },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService;
  const coupons = {
    apply: async () => ({ coupon: { id: 7, code: 'SALE', usageLimit: 5 }, discount: 10000 }),
  } as unknown as CouponsService;
  const settings = {
    get: async () => ({ tax: { defaultVatRate: '8' }, shippingMode: 'FIXED', shippingFee: 20000, freeShippingThreshold: 300000, minOrderValue: 0 }),
    getPublic: async () => ({ payment: { cod: true, bankTransfer: false, vnpay: false }, deliverySlots: [], deliveryDaysAhead: 3, einvoice: { enabled: false }, minOrderValue: 0 }),
  } as unknown as SettingsService;
  const platform = { get: async () => ({ delivery: defaultTariff() }) } as unknown as PlatformService;
  const notifications = { notifyStaff: async () => {} } as unknown as NotificationsService;
  const service = new OrdersService(prisma, coupons, settings, {} as DeliveryCoreService, notifications, platform);
  return { service, calls };
}

const dto = {
  items: [{ variantId: 1, quantity: 1 }], couponCode: 'SALE', customerName: 'A', phone: '0900000000',
  addressParts: { street: '1 Lê Lợi', provinceCode: 79, provinceName: 'TP HCM', districtCode: 760, districtName: 'Quận 1', wardCode: 26734, wardName: 'Phường Bến Nghé' },
} as any;

const inStore = <T>(fn: () => Promise<T>) => tenantAls.run({ storeId: STORE.id, store: STORE }, fn);

test('create: throw khi coupon đã hết lượt (updateMany count = 0)', async () => {
  const { service, calls } = setup(0);
  await assert.rejects(inStore(() => service.create(dto, 1)), (e: unknown) => {
    assert.ok(e instanceof BadRequestException);
    assert.equal(e.message, 'Mã giảm giá đã hết lượt sử dụng');
    return true;
  });
  assert.deepEqual(calls.couponWhere, { id: 7, OR: [{ usageLimit: null }, { usedCount: { lt: 5 } }] });
  assert.equal(calls.orderCreated, false);
});

test('create: tạo đơn khi coupon còn lượt', async () => {
  const { service, calls } = setup(1);
  await inStore(() => service.create(dto, 1));
  assert.equal(calls.orderCreated, true);
});
