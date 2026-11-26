import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  if (!store) throw new Error('Chưa có cửa hàng hoạt động để tạo khách hàng mẫu');
  const password = await bcrypt.hash('123456', 10);
  const samples = [
    { email: 'customer@grocery.local', fullName: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Quận 1, TP.HCM', total: 1250000, points: 980, lifetime: 1250, tier: 'SILVER', orders: 4 },
    { email: 'lan.nguyen@grocery.local', fullName: 'Nguyễn Thị Lan', phone: '0912345678', address: '28 Nguyễn Huệ, Quận 1, TP.HCM', total: 5680000, points: 4210, lifetime: 5680, tier: 'GOLD', orders: 8 },
    { email: 'minh.tran@grocery.local', fullName: 'Trần Quốc Minh', phone: '0987654321', address: '75 Võ Văn Tần, Quận 3, TP.HCM', total: 780000, points: 630, lifetime: 780, tier: 'BRONZE', orders: 3 },
    { email: 'thuy.le@grocery.local', fullName: 'Lê Thanh Thúy', phone: '0909888777', address: '16 Trần Hưng Đạo, Quận 5, TP.HCM', total: 10850000, points: 8920, lifetime: 10850, tier: 'DIAMOND', orders: 12 },
  ];
  const vip = await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: 'VIP50K' } },
    create: { storeId: store.id, code: 'VIP50K', description: 'Voucher riêng giảm 50.000đ cho khách VIP', type: 'FIXED', value: 50000, minOrderValue: 300000, audienceAll: false },
    update: { description: 'Voucher riêng giảm 50.000đ cho khách VIP', isActive: true },
  });
  for (const [i, sample] of samples.entries()) {
    const user = await prisma.user.upsert({
      where: { email: sample.email },
      create: { email: sample.email, password, fullName: sample.fullName, phone: sample.phone, address: sample.address, role: 'CUSTOMER' },
      update: { fullName: sample.fullName, phone: sample.phone, address: sample.address, role: 'CUSTOMER', isActive: true },
    });
    await prisma.loyaltyAccount.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      create: { storeId: store.id, userId: user.id, points: sample.points, lifetimePoints: sample.lifetime, tier: sample.tier },
      update: { points: sample.points, lifetimePoints: sample.lifetime, tier: sample.tier },
    });
    let newestOrderId = 0;
    for (let j = 0; j < sample.orders; j++) {
      const code = `CRMMAU${i + 1}${String(j + 1).padStart(2, '0')}`;
      const amount = j === sample.orders - 1 ? sample.total - Math.floor(sample.total / sample.orders) * (sample.orders - 1) : Math.floor(sample.total / sample.orders);
      const createdAt = new Date(Date.now() - (i + j + 1) * 86400000);
      const order = await prisma.order.upsert({
        where: { code },
        create: { code, storeId: store.id, userId: user.id, channel: j % 2 ? 'ONLINE' : 'POS', customerName: user.fullName, phone: user.phone || '', address: j % 2 ? user.address || 'Địa chỉ khách hàng' : 'Mua tại cửa hàng', status: 'COMPLETED', paymentMethod: j % 2 ? 'COD' : 'CASH', paymentStatus: 'PAID', paidAt: createdAt, subtotal: amount, total: amount, createdAt },
        update: { storeId: store.id, userId: user.id, customerName: user.fullName, phone: user.phone || '', subtotal: amount, total: amount, status: 'COMPLETED', paymentStatus: 'PAID' },
      });
      if (!newestOrderId) newestOrderId = order.id;
    }
    await prisma.loyaltyTransaction.deleteMany({ where: { storeId: store.id, userId: user.id, note: { contains: 'dữ liệu mẫu CRM' } } });
    await prisma.loyaltyTransaction.create({ data: { storeId: store.id, userId: user.id, orderId: newestOrderId, type: 'EARN_ORDER', points: sample.lifetime, balance: sample.lifetime, note: `Tích điểm dữ liệu mẫu CRM (${sample.orders} đơn)` } });
    if (sample.lifetime > sample.points) await prisma.loyaltyTransaction.create({ data: { storeId: store.id, userId: user.id, orderId: newestOrderId, type: 'REDEEM_POS', points: sample.points - sample.lifetime, balance: sample.points, note: 'Dùng điểm dữ liệu mẫu CRM tại POS' } });
    if (['GOLD', 'DIAMOND'].includes(sample.tier)) await prisma.couponRecipient.upsert({ where: { couponId_userId: { couponId: vip.id, userId: user.id } }, create: { couponId: vip.id, userId: user.id }, update: {} });
  }
  console.log(`Đã tạo/cập nhật ${samples.length} khách mẫu cho cửa hàng: ${store.name} (#${store.id})`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
