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

/** Mã vạch EAN-13 hợp lệ (đầu 893 = Việt Nam) */
function ean13(n: number) {
  const body = `893${String(n).padStart(9, '0')}`;
  const sum = [...body].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}
let barcodeSeq = 100001;

/** Ảnh minh hoạ có sẵn ở frontend/public/products (đồ hoạ Twemoji – CC-BY 4.0) */
const img = (seed: string) => `/products/${seed}.svg`;
const DEMO_IMAGES = ['gao-st25-ong-cua', 'mi-hao-hao', 'sua-tuoi-tiet-trung-vinamilk', 'nuoc-mam-nam-ngu', 'coca-cola', 'tao-envy-new-zealand', 'thit-ba-chi-heo', 'banh-quy-cosy-marie', 'snack-khoai-tay-lay-s', 'nuoc-giat-omo-matic'];

const categories = [
  { name: 'Rau củ & Trái cây', image: img('cat-veg') },
  { name: 'Thịt, cá & Hải sản', image: img('cat-meat') },
  { name: 'Đồ uống', image: img('cat-drink') },
  { name: 'Sữa & Sản phẩm từ sữa', image: img('cat-milk') },
  { name: 'Gạo, mì & Thực phẩm khô', image: img('cat-rice') },
  { name: 'Gia vị', image: img('cat-spice') },
  { name: 'Bánh kẹo & Snack', image: img('cat-snack') },
  { name: 'Hoá phẩm & Chăm sóc nhà cửa', image: img('cat-clean') },
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

/** Tạo danh mục + sản phẩm + biến thể cho 1 cửa hàng */
async function seedCatalog(storeId: number, list: Seed[], priceFactor = 1) {
  const catMap: Record<string, number> = {};
  for (const [i, c] of categories.entries()) {
    if (!list.some((p) => p.category === c.name)) continue;
    const created = await prisma.category.create({ data: { ...c, slug: slugify(c.name), sortOrder: i, storeId } });
    catMap[c.name] = created.id;
  }
  for (const [pi, p] of list.entries()) {
    const variants = Object.fromEntries(Object.entries(p.variants).map(([k, v]) => [k, { ...v, price: Math.round((v.price * priceFactor) / 500) * 500, compareAtPrice: v.compareAtPrice && Math.round((v.compareAtPrice * priceFactor) / 500) * 500 }]));
    const prices = Object.values(variants).map((v) => v.price);
    const product = await prisma.product.create({
      data: {
        storeId, name: p.name, slug: slugify(p.name), description: p.description, brand: p.brand, unit: p.unit,
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
    const prefix = slugify(p.brand).replace(/-/g, '').slice(0, 4).toUpperCase();
    for (const [key, v] of Object.entries(variants)) {
      const parts = p.options.length ? key.split(' / ') : [];
      const variant = await prisma.productVariant.create({
        data: {
          storeId, productId: product.id, name: key, position: pos,
          // SKU ổn định giữa các lần seed: theo thứ tự sản phẩm (SKU chỉ cần duy nhất trong 1 cửa hàng)
          sku: `${prefix}-${100 + pi + 1}-${String(++pos).padStart(2, '0')}`,
          barcode: ean13(barcodeSeq++),
          price: v.price, compareAtPrice: v.compareAtPrice, costPrice: Math.round(v.price * 0.8), stock: v.stock,
          optionValues: { create: parts.map((val, idx) => ({ optionValueId: valueIds[idx].get(val)! })) },
        },
      });
      if (v.stock > 0)
        await prisma.inventoryLog.create({ data: { variantId: variant.id, change: v.stock, stockAfter: v.stock, unitCost: variant.costPrice, reason: 'IMPORT', note: 'Tồn kho ban đầu' } });
    }
  }
}

const monthsFromNow = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d; };

/**
 * DB cũ (nâng cấp từ bản 1 cửa hàng) chưa có super admin → tạo tài khoản mặc định để vào /super.
 * Production: chỉ tạo khi có SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD.
 */
/** DB cũ dùng ảnh ngẫu nhiên picsum (không đúng mặt hàng) → đổi sang ảnh minh hoạ */
async function fixDemoImages() {
  const re = /^https:\/\/picsum\.photos\/seed\/([a-z0-9-]+)\/600\/600$/;
  const map = (u: string | null) => {
    const m = u?.match(re);
    if (!m) return u;
    const seed = m[1];
    if (DEMO_IMAGES.includes(seed.replace(/-2$/, ''))) return img(seed);
    if (['veg', 'meat', 'drink', 'milk', 'rice', 'spice', 'snack', 'clean'].includes(seed)) return img(`cat-${seed}`);
    return u;
  };
  let n = 0;
  for (const p of await prisma.product.findMany({ where: { thumbnail: { startsWith: 'https://picsum.photos/seed/' } }, select: { id: true, thumbnail: true, images: true } })) {
    const images = Array.isArray(p.images) ? (p.images as string[]).map((u) => map(u)) : p.images;
    await prisma.product.update({ where: { id: p.id }, data: { thumbnail: map(p.thumbnail), images: images as any } });
    n++;
  }
  for (const c of await prisma.category.findMany({ where: { image: { startsWith: 'https://picsum.photos/seed/' } }, select: { id: true, image: true } })) {
    await prisma.category.update({ where: { id: c.id }, data: { image: map(c.image) } });
    n++;
  }
  if (n) console.log(`🖼  Đã thay ${n} ảnh demo cũ bằng ảnh minh hoạ đúng mặt hàng`);
}

async function ensureSuperAdmin() {
  if (await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })) return;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const email = (process.env.SEED_ADMIN_EMAIL || 'super@grocery.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || (isProd ? '' : '123456');
  if (!password) {
    console.log('⚠️  Chưa có super admin. Chạy: npm run create-super-admin -- <email> <mật khẩu>');
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, password: hash, fullName: 'Quản trị nền tảng', role: 'SUPER_ADMIN' },
    update: { password: hash, role: 'SUPER_ADMIN', storeId: null, isActive: true },
  });
  console.log(`✅ Đã tạo super admin: ${email}${process.env.SEED_ADMIN_PASSWORD ? '' : ' / 123456 (hãy đổi mật khẩu sau khi đăng nhập)'}`);
}

async function main() {
  // An toàn cho CI/CD: chỉ seed khi DB trống, trừ khi FORCE_SEED=true (xoá sạch & seed lại)
  const force = process.env.FORCE_SEED === 'true';
  if (!force && (await prisma.user.count()) > 0) {
    console.log('ℹ️  DB đã có dữ liệu → bỏ qua seed (đặt FORCE_SEED=true để seed lại từ đầu)');
    await ensureSuperAdmin();
    await fixDemoImages();
    return;
  }
  if (force && process.env.VERCEL_ENV === 'production') throw new Error('Không cho phép FORCE_SEED trên production');
  console.log('🌱 Seeding...');
  await prisma.inventoryLog.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.address.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.storePayment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.stockDocument.deleteMany(); // dòng phiếu kho chặn xoá biến thể (Restrict)
  await prisma.store.deleteMany(); // cascade: danh mục, sản phẩm, mã giảm giá, NCC, phiếu kho, cài đặt
  await prisma.plan.deleteMany();

  // Gói dịch vụ
  const [free, basic, pro] = await Promise.all([
    prisma.plan.create({ data: { code: 'free', name: 'Miễn phí', description: 'Dùng thử cho cửa hàng nhỏ', priceMonthly: 0, maxProducts: 30, maxStaff: 1, sortOrder: 1 } }),
    prisma.plan.create({ data: { code: 'basic', name: 'Cơ bản', description: 'Cửa hàng tạp hoá vừa', priceMonthly: 199000, maxProducts: 1000, maxStaff: 5, sortOrder: 2 } }),
    prisma.plan.create({ data: { code: 'pro', name: 'Chuyên nghiệp', description: 'Không giới hạn sản phẩm & nhân viên', priceMonthly: 499000, maxProducts: null, maxStaff: null, sortOrder: 3 } }),
  ]);

  // Super admin – production: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD; local: super@grocery.local / 123456
  const isDemo = !process.env.SEED_ADMIN_PASSWORD;
  const superEmail = (process.env.SEED_ADMIN_EMAIL || 'super@grocery.local').toLowerCase();
  const superAdmin = await prisma.user.create({
    data: { email: superEmail, password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || '123456', 10), fullName: 'Quản trị nền tảng', role: 'SUPER_ADMIN' },
  });
  if (!isDemo) {
    console.log(`✅ Seed production xong. Super admin: ${superEmail}. Đăng nhập /super để tạo cửa hàng đối tác.`);
    return;
  }

  const pwd = await bcrypt.hash('123456', 10);
  // Cửa hàng 1: đầy đủ sản phẩm
  const s1 = await prisma.store.create({
    data: { slug: 'tap-hoa-xanh', name: 'Tạp Hoá Xanh', phone: '1900 1234', address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh', planId: pro.id, planExpiresAt: monthsFromNow(12), lat: 10.7743, lng: 106.7009,
      businessName: 'Công ty TNHH Tạp Hoá Xanh', businessType: 'CONG_TY', taxCode: '0312345678', businessAddress: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      representative: 'Trần Văn Xanh', representativeId: '079088001234', representativePhone: '0903111222',
      bankName: 'Vietcombank', bankAccountNo: '1234567890', bankAccountName: 'CONG TY TNHH TAP HOA XANH', contractNo: 'HD-2026-001', contractSignedAt: new Date() },
  });
  // Cửa hàng 2: ít sản phẩm, giá khác, gói cơ bản
  const s2 = await prisma.store.create({
    data: { slug: 'tap-hoa-ba-nam', name: 'Tạp Hoá Bà Năm', phone: '0908 555 666', address: '45 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh', planId: basic.id, planExpiresAt: monthsFromNow(1), lat: 10.7569, lng: 106.6826,
      businessName: 'Hộ kinh doanh Nguyễn Thị Năm', businessType: 'HKD', taxCode: '8012345678', representative: 'Nguyễn Thị Năm', representativeId: '079175004567',
      representativePhone: '0908555666', bankName: 'MB Bank', bankAccountNo: '0908555666', bankAccountName: 'NGUYEN THI NAM', contractNo: 'HD-2026-002', contractSignedAt: new Date() },
  });
  for (const [s, plan, months] of [[s1, pro, 12], [s2, basic, 1]] as const)
    await prisma.storePayment.create({
      data: { storeId: s.id, planId: plan.id, months, amount: plan.priceMonthly * months, periodFrom: new Date(), periodTo: s.planExpiresAt!, method: 'Chuyển khoản', note: 'Đăng ký ban đầu', createdById: superAdmin.id },
    });

  await prisma.user.createMany({
    data: [
      { email: 'admin@grocery.local', password: pwd, fullName: 'Chủ Tạp Hoá Xanh', role: 'ADMIN', storeId: s1.id },
      { email: 'staff@grocery.local', password: pwd, fullName: 'Nhân viên Tạp Hoá Xanh', role: 'STAFF', storeId: s1.id },
      { email: 'owner2@grocery.local', password: pwd, fullName: 'Bà Năm', role: 'ADMIN', storeId: s2.id },
      { email: 'customer@grocery.local', password: pwd, fullName: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q.1, TP.HCM' },
    ],
  });
  // Tài xế giao hàng của sàn
  await prisma.user.create({
    data: {
      email: 'shipper@grocery.local', password: pwd, fullName: 'Trần Văn Tài', phone: '0938111222', role: 'SHIPPER',
      shipperProfile: { create: { vehicleType: 'XE_MAY', plateNumber: '59X1-234.56', area: 'Quận 1, Quận 3, Quận 5', lat: 10.7769, lng: 106.6953 } },
    },
  });

  await seedCatalog(s1.id, products);
  await seedCatalog(s2.id, products.filter((p) => ['Mì Hảo Hảo', 'Coca-Cola', 'Nước mắm Nam Ngư', 'Bánh quy Cosy Marie', "Snack khoai tây Lay's"].includes(p.name)), 1.05);

  await prisma.setting.createMany({
    data: [
      {
        storeId: s1.id, key: 'store',
        value: {
          storeName: s1.name, hotline: s1.phone, address: s1.address, email: 'hotro@taphoaxanh.vn', taxCode: '0312345678',
          payment: { cod: true, bankTransfer: true, vnpay: true },
          bank: { bankBin: '970436', bankName: 'Vietcombank', accountNo: '1234567890', accountName: 'CONG TY TAP HOA XANH' },
        },
      },
      {
        storeId: s2.id, key: 'store',
        value: {
          storeName: s2.name, slogan: 'Tạp hoá đầu hẻm – có gì bán nấy', hotline: s2.phone, address: s2.address,
          announcement: '🛵 Giao trong bán kính 3km · Miễn phí ship đơn từ 150.000₫', freeShippingThreshold: 150000, shippingFee: 15000,
          payment: { cod: true, bankTransfer: true, vnpay: false },
          bank: { bankBin: '970422', bankName: 'MB Bank', accountNo: '0908555666', accountName: 'NGUYEN THI NAM' }, banners: [],
        },
      },
    ],
  });

  await prisma.supplier.createMany({
    data: [
      { storeId: s1.id, name: 'Công ty TNHH Phân phối Hàng tiêu dùng Sài Gòn', contactName: 'Anh Minh', phone: '0281234567', email: 'sales@pptdsg.vn', taxCode: '0301234567', address: '45 Nguyễn Văn Cừ, Q.5, TP.HCM' },
      { storeId: s1.id, name: 'Nông trại Rau sạch Đà Lạt', contactName: 'Chị Lan', phone: '0909888777', address: 'Phường 7, TP. Đà Lạt, Lâm Đồng' },
      { storeId: s2.id, name: 'Đại lý Chợ Lớn', contactName: 'Chú Tư', phone: '0283855123', address: 'Chợ Bình Tây, Q.6, TP.HCM' },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      { storeId: s1.id, code: 'WELCOME10', description: 'Giảm 10% tối đa 50k cho đơn từ 100k', type: 'PERCENT', value: 10, minOrderValue: 100000, maxDiscount: 50000 },
      { storeId: s1.id, code: 'GIAM20K', description: 'Giảm 20k cho đơn từ 200k', type: 'FIXED', value: 20000, minOrderValue: 200000, usageLimit: 100 },
      { storeId: s2.id, code: 'BANAM5K', description: 'Giảm 5k cho đơn từ 50k', type: 'FIXED', value: 5000, minOrderValue: 50000 },
    ],
  });
  console.log('✅ Seed xong. Mật khẩu tất cả tài khoản: 123456');
  console.log('   Super admin: super@grocery.local');
  console.log('   Tạp Hoá Xanh (/s/tap-hoa-xanh): admin@grocery.local, staff@grocery.local');
  console.log('   Tạp Hoá Bà Năm (/s/tap-hoa-ba-nam): owner2@grocery.local');
  console.log('   Khách hàng: customer@grocery.local');
  console.log('   Tài xế: shipper@grocery.local (vào /shipper)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
