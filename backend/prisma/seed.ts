import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type Seed = {
  name: string; category: string; brand: string; unit: string; featured?: boolean; description: string;
  options: { name: string; values: string[] }[];
  /** giá theo tổ hợp; key = values join " / " ; nếu không có options thì key "Mặc định" */
  variants: Record<string, { price: number; compareAtPrice?: number; stock: number }>;
};

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

const categories = [
  { name: 'Rau củ & Trái cây', image: img('veg') },
  { name: 'Thịt, cá & Hải sản', image: img('meat') },
  { name: 'Đồ uống', image: img('drink') },
  { name: 'Sữa & Sản phẩm từ sữa', image: img('milk') },
  { name: 'Gạo, mì & Thực phẩm khô', image: img('rice') },
  { name: 'Gia vị', image: img('spice') },
  { name: 'Bánh kẹo & Snack', image: img('snack') },
  { name: 'Hoá phẩm & Chăm sóc nhà cửa', image: img('clean') },
];

const products: Seed[] = [
  {
    name: 'Gạo ST25 Ông Cua', category: 'Gạo, mì & Thực phẩm khô', brand: 'Ông Cua', unit: 'túi', featured: true,
    description: 'Gạo ST25 thơm dẻo, đạt giải gạo ngon nhất thế giới.',
    options: [{ name: 'Khối lượng', values: ['2kg', '5kg', '10kg'] }],
    variants: { '2kg': { price: 75000, stock: 40 }, '5kg': { price: 179000, compareAtPrice: 195000, stock: 25 }, '10kg': { price: 345000, stock: 3 } },
  },
  {
    name: 'Mì Hảo Hảo', category: 'Gạo, mì & Thực phẩm khô', brand: 'Acecook', unit: 'gói', featured: true,
    description: 'Mì ăn liền quốc dân, nhiều hương vị.',
    options: [
      { name: 'Hương vị', values: ['Tôm chua cay', 'Sa tế hành tím', 'Gà vàng'] },
      { name: 'Quy cách', values: ['Gói lẻ', 'Thùng 30 gói'] },
    ],
    variants: {
      'Tôm chua cay / Gói lẻ': { price: 4500, stock: 200 },
      'Tôm chua cay / Thùng 30 gói': { price: 118000, compareAtPrice: 135000, stock: 20 },
      'Sa tế hành tím / Gói lẻ': { price: 4500, stock: 150 },
      'Sa tế hành tím / Thùng 30 gói': { price: 118000, stock: 12 },
      'Gà vàng / Gói lẻ': { price: 4500, stock: 0 },
      'Gà vàng / Thùng 30 gói': { price: 118000, stock: 4 },
    },
  },
  {
    name: 'Sữa tươi tiệt trùng Vinamilk', category: 'Sữa & Sản phẩm từ sữa', brand: 'Vinamilk', unit: 'hộp', featured: true,
    description: 'Sữa tươi tiệt trùng 100% từ sữa bò tươi.',
    options: [
      { name: 'Loại', values: ['Có đường', 'Ít đường', 'Không đường'] },
      { name: 'Dung tích', values: ['180ml', '1L'] },
    ],
    variants: {
      'Có đường / 180ml': { price: 8000, stock: 120 }, 'Có đường / 1L': { price: 36000, stock: 30 },
      'Ít đường / 180ml': { price: 8000, stock: 100 }, 'Ít đường / 1L': { price: 36000, stock: 18 },
      'Không đường / 180ml': { price: 8000, stock: 90 }, 'Không đường / 1L': { price: 36000, stock: 2 },
    },
  },
  {
    name: 'Nước mắm Nam Ngư', category: 'Gia vị', brand: 'Chin-su', unit: 'chai',
    description: 'Nước mắm cá cơm, vị đậm đà.',
    options: [{ name: 'Dung tích', values: ['500ml', '900ml'] }],
    variants: { '500ml': { price: 32000, stock: 50 }, '900ml': { price: 52000, compareAtPrice: 58000, stock: 35 } },
  },
  {
    name: 'Coca-Cola', category: 'Đồ uống', brand: 'Coca-Cola', unit: 'chai', featured: true,
    description: 'Nước giải khát có ga.',
    options: [
      { name: 'Loại', values: ['Nguyên bản', 'Zero'] },
      { name: 'Quy cách', values: ['Lon 320ml', 'Chai 1.5L', 'Lốc 6 lon'] },
    ],
    variants: {
      'Nguyên bản / Lon 320ml': { price: 10000, stock: 240 }, 'Nguyên bản / Chai 1.5L': { price: 21000, stock: 60 },
      'Nguyên bản / Lốc 6 lon': { price: 56000, compareAtPrice: 60000, stock: 30 },
      'Zero / Lon 320ml': { price: 11000, stock: 120 }, 'Zero / Chai 1.5L': { price: 22000, stock: 20 },
      'Zero / Lốc 6 lon': { price: 60000, stock: 10 },
    },
  },
  {
    name: 'Táo Envy New Zealand', category: 'Rau củ & Trái cây', brand: 'Envy', unit: 'kg', featured: true,
    description: 'Táo Envy nhập khẩu giòn ngọt.',
    options: [{ name: 'Khối lượng', values: ['500g', '1kg'] }],
    variants: { '500g': { price: 79000, stock: 30 }, '1kg': { price: 149000, compareAtPrice: 165000, stock: 15 } },
  },
  {
    name: 'Thịt ba chỉ heo', category: 'Thịt, cá & Hải sản', brand: 'MEATDeli', unit: 'khay',
    description: 'Thịt ba chỉ tươi, đóng khay hút chân không.',
    options: [{ name: 'Khối lượng', values: ['300g', '500g'] }],
    variants: { '300g': { price: 54000, stock: 20 }, '500g': { price: 89000, stock: 4 } },
  },
  {
    name: 'Bánh quy Cosy Marie', category: 'Bánh kẹo & Snack', brand: 'Kinh Đô', unit: 'gói',
    description: 'Bánh quy giòn thơm vị sữa.',
    options: [],
    variants: { 'Mặc định': { price: 25000, stock: 80 } },
  },
  {
    name: 'Snack khoai tây Lay\'s', category: 'Bánh kẹo & Snack', brand: "Lay's", unit: 'gói',
    description: 'Snack khoai tây chiên giòn.',
    options: [
      { name: 'Hương vị', values: ['Tự nhiên', 'Tảo biển', 'Sườn nướng'] },
      { name: 'Khối lượng', values: ['58g', '95g'] },
    ],
    variants: {
      'Tự nhiên / 58g': { price: 15000, stock: 60 }, 'Tự nhiên / 95g': { price: 23000, stock: 40 },
      'Tảo biển / 58g': { price: 15000, stock: 55 }, 'Tảo biển / 95g': { price: 23000, stock: 30 },
      'Sườn nướng / 58g': { price: 15000, stock: 0 }, 'Sườn nướng / 95g': { price: 23000, stock: 25 },
    },
  },
  {
    name: 'Nước giặt OMO Matic', category: 'Hoá phẩm & Chăm sóc nhà cửa', brand: 'OMO', unit: 'túi',
    description: 'Nước giặt cho máy giặt cửa trước & cửa trên.',
    options: [
      { name: 'Loại máy', values: ['Cửa trên', 'Cửa trước'] },
      { name: 'Khối lượng', values: ['2kg', '3.6kg'] },
    ],
    variants: {
      'Cửa trên / 2kg': { price: 129000, stock: 20 }, 'Cửa trên / 3.6kg': { price: 219000, compareAtPrice: 245000, stock: 12 },
      'Cửa trước / 2kg': { price: 135000, stock: 15 }, 'Cửa trước / 3.6kg': { price: 229000, stock: 6 },
    },
  },
];

async function main() {
  // An toàn cho CI/CD: chỉ seed khi DB trống, trừ khi FORCE_SEED=true (xoá sạch & seed lại)
  const force = process.env.FORCE_SEED === 'true';
  if (!force && (await prisma.user.count()) > 0) {
    console.log('ℹ️  DB đã có dữ liệu → bỏ qua seed (đặt FORCE_SEED=true để seed lại từ đầu)');
    return;
  }
  if (force && process.env.VERCEL_ENV === 'production') throw new Error('Không cho phép FORCE_SEED trên production');
  console.log('🌱 Seeding...');
  await prisma.inventoryLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();

  // Production: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (do scripts/vercel-setup.sh sinh ngẫu nhiên)
  // Local/CI: dùng tài khoản demo mật khẩu 123456
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@grocery.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '123456';
  const isDemo = !process.env.SEED_ADMIN_PASSWORD;
  await prisma.user.create({
    data: { email: adminEmail.toLowerCase(), password: await bcrypt.hash(adminPassword, 10), fullName: 'Quản trị viên', role: 'ADMIN' },
  });
  if (isDemo) {
    const pwd = await bcrypt.hash('123456', 10);
    await prisma.user.create({ data: { email: 'staff@grocery.local', password: pwd, fullName: 'Nhân viên bán hàng', role: 'STAFF' } });
    await prisma.user.create({
      data: { email: 'customer@grocery.local', password: pwd, fullName: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q.1, TP.HCM' },
    });
  }

  const catMap: Record<string, number> = {};
  for (const [i, c] of categories.entries()) {
    const created = await prisma.category.create({ data: { ...c, slug: slugify(c.name), sortOrder: i } });
    catMap[c.name] = created.id;
  }

  for (const p of products) {
    const prices = Object.values(p.variants).map((v) => v.price);
    const product = await prisma.product.create({
      data: {
        name: p.name, slug: slugify(p.name), description: p.description, brand: p.brand, unit: p.unit,
        isFeatured: !!p.featured, categoryId: catMap[p.category],
        thumbnail: img(slugify(p.name)), images: [img(slugify(p.name)), img(slugify(p.name) + '-2')],
        minPrice: Math.min(...prices), maxPrice: Math.max(...prices),
      },
    });
    const valueIds: Map<string, number>[] = [];
    for (const [i, o] of p.options.entries()) {
      const opt = await prisma.productOption.create({
        data: { productId: product.id, name: o.name, position: i, values: { create: o.values.map((value, j) => ({ value, position: j })) } },
        include: { values: true },
      });
      valueIds.push(new Map(opt.values.map((v) => [v.value, v.id])));
    }
    let pos = 0;
    const prefix = slugify(p.brand).slice(0, 4).toUpperCase();
    for (const [key, v] of Object.entries(p.variants)) {
      const parts = p.options.length ? key.split(' / ') : [];
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id, name: key, position: pos,
          sku: `${prefix}-${product.id}-${String(++pos).padStart(2, '0')}`,
          price: v.price, compareAtPrice: v.compareAtPrice, costPrice: Math.round(v.price * 0.8), stock: v.stock,
          optionValues: { create: parts.map((val, idx) => ({ optionValueId: valueIds[idx].get(val)! })) },
        },
      });
      if (v.stock > 0)
        await prisma.inventoryLog.create({ data: { variantId: variant.id, change: v.stock, stockAfter: v.stock, reason: 'IMPORT', note: 'Seed' } });
    }
  }

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', description: 'Giảm 10% tối đa 50k cho đơn từ 100k', type: 'PERCENT', value: 10, minOrderValue: 100000, maxDiscount: 50000 },
      { code: 'GIAM20K', description: 'Giảm 20k cho đơn từ 200k', type: 'FIXED', value: 20000, minOrderValue: 200000, usageLimit: 100 },
    ],
  });
  console.log(`✅ Seed xong. Admin: ${adminEmail}${isDemo ? ' / 123456' : ' (mật khẩu theo SEED_ADMIN_PASSWORD)'}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
