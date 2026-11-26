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
  /** số ảnh thật ở frontend/public/products/real (<slug>.jpg, <slug>-2.jpg, …) – mặc định 1 */
  photos?: number;
};

/** Mã vạch EAN-13 hợp lệ (đầu 893 = Việt Nam) */
function ean13(n: number) {
  const body = `893${String(n).padStart(9, '0')}`;
  const sum = [...body].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}
let barcodeSeq = 100001;

/** Ảnh danh mục: đồ hoạ ở frontend/public/products (Twemoji – CC-BY 4.0) */
const img = (seed: string) => `/products/${seed}.svg`;
/** Ảnh sản phẩm: ảnh chụp thật ở frontend/public/products/real (nguồn & giấy phép: real/CREDITS.txt) */
const photos = (slug: string, n = 1) => Array.from({ length: n }, (_, i) => `/products/real/${slug}${i ? `-${i + 1}` : ''}.jpg`);

/** Sản phẩm demo của bản cũ (ảnh SVG/picsum) → ảnh thật; 2 sản phẩm không có ảnh thật được đổi sang mặt hàng tương ứng */
const DEMO_UPGRADE: Record<string, { photos: number; rename?: { name: string; slug: string; brand: string; unit: string; description: string } }> = {
  'gao-st25-ong-cua': { photos: 2 },
  'mi-hao-hao': { photos: 2 },
  'sua-tuoi-tiet-trung-vinamilk': { photos: 2 },
  'nuoc-mam-nam-ngu': { photos: 1, rename: { name: 'Nước mắm Chin-su', slug: 'nuoc-mam-chin-su', brand: 'Chin-su', unit: 'chai', description: 'Nước mắm cá hồi Chin-su, vị đậm đà, thơm ngon.' } },
  'coca-cola': { photos: 3 },
  'tao-envy-new-zealand': { photos: 2 },
  'thit-ba-chi-heo': { photos: 2 },
  'banh-quy-cosy-marie': { photos: 1, rename: { name: 'Bánh Choco-Pie Orion', slug: 'banh-choco-pie-orion', brand: 'Orion', unit: 'hộp', description: 'Bánh Choco-Pie nhân marshmallow phủ socola.' } },
  'snack-khoai-tay-lay-s': { photos: 2 },
  'nuoc-giat-omo-matic': { photos: 1 },
};

const categories = [
  { name: 'Rau củ & Trái cây', image: img('cat-veg') },
  { name: 'Thịt, cá & Hải sản', image: img('cat-meat') },
  { name: 'Trứng', image: img('cat-egg') },
  { name: 'Đồ uống', image: img('cat-drink') },
  { name: 'Cà phê & Trà', image: img('cat-coffee') },
  { name: 'Sữa & Sản phẩm từ sữa', image: img('cat-milk') },
  { name: 'Gạo, mì & Thực phẩm khô', image: img('cat-rice') },
  { name: 'Gia vị', image: img('cat-spice') },
  { name: 'Đồ hộp & Đồ khô chế biến', image: img('cat-canned') },
  { name: 'Bánh kẹo & Snack', image: img('cat-snack') },
  { name: 'Hoá phẩm & Chăm sóc nhà cửa', image: img('cat-clean') },
  { name: 'Chăm sóc cá nhân', image: img('cat-care') },
];

/** Biến thể 1 giá (không tuỳ chọn) */
const one = (price: number, stock: number, compareAtPrice?: number) => ({ 'Mặc định': { price, stock, compareAtPrice } });
/** 1 tuỳ chọn: [giá trị, giá, tồn, giá gốc?][] */
const opt = (name: string, rows: [string, number, number, number?][]) => ({
  options: [{ name, values: rows.map((r) => r[0]) }],
  variants: Object.fromEntries(rows.map(([v, price, stock, compareAtPrice]) => [v, { price, stock, compareAtPrice }])),
});

const products: Seed[] = [
  {
    name: 'Gạo ST25 Ông Cua', category: 'Gạo, mì & Thực phẩm khô', brand: 'Ông Cua', unit: 'túi', featured: true, photos: 2,
    description: 'Gạo ST25 thơm dẻo, đạt giải gạo ngon nhất thế giới.',
    options: [{ name: 'Khối lượng', values: ['2kg', '5kg', '10kg'] }],
    variants: { '2kg': { price: 75000, stock: 40 }, '5kg': { price: 179000, compareAtPrice: 195000, stock: 25 }, '10kg': { price: 345000, stock: 3 } },
  },
  {
    name: 'Mì Hảo Hảo', category: 'Gạo, mì & Thực phẩm khô', brand: 'Acecook', unit: 'gói', featured: true, photos: 2,
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
    name: 'Sữa tươi tiệt trùng Vinamilk', category: 'Sữa & Sản phẩm từ sữa', brand: 'Vinamilk', unit: 'hộp', featured: true, photos: 2,
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
    name: 'Nước mắm Chin-su', category: 'Gia vị', brand: 'Chin-su', unit: 'chai',
    description: 'Nước mắm cá hồi Chin-su, vị đậm đà, thơm ngon.',
    options: [{ name: 'Dung tích', values: ['500ml', '900ml'] }],
    variants: { '500ml': { price: 32000, stock: 50 }, '900ml': { price: 52000, compareAtPrice: 58000, stock: 35 } },
  },
  {
    name: 'Coca-Cola', category: 'Đồ uống', brand: 'Coca-Cola', unit: 'chai', featured: true, photos: 3,
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
    name: 'Táo Envy New Zealand', category: 'Rau củ & Trái cây', brand: 'Envy', unit: 'kg', featured: true, photos: 2,
    description: 'Táo Envy nhập khẩu giòn ngọt.',
    options: [{ name: 'Khối lượng', values: ['500g', '1kg'] }],
    variants: { '500g': { price: 79000, stock: 30 }, '1kg': { price: 149000, compareAtPrice: 165000, stock: 15 } },
  },
  {
    name: 'Thịt ba chỉ heo', category: 'Thịt, cá & Hải sản', brand: 'MEATDeli', unit: 'khay', photos: 2,
    description: 'Thịt ba chỉ tươi, đóng khay hút chân không.',
    options: [{ name: 'Khối lượng', values: ['300g', '500g'] }],
    variants: { '300g': { price: 54000, stock: 20 }, '500g': { price: 89000, stock: 4 } },
  },
  {
    name: 'Bánh Choco-Pie Orion', category: 'Bánh kẹo & Snack', brand: 'Orion', unit: 'hộp',
    description: 'Bánh Choco-Pie nhân marshmallow phủ socola.',
    ...opt('Quy cách', [['Hộp 6 cái', 27000, 60], ['Hộp 12 cái', 52000, 30, 56000]]),
  },
  {
    name: 'Snack khoai tây Lay\'s', category: 'Bánh kẹo & Snack', brand: "Lay's", unit: 'gói', photos: 2,
    description: 'Snack khoai tây chiên giòn.',
    options: [
      { name: 'Hương vị', values: ['Tảo biển', 'Tự nhiên', 'Sườn nướng'] },
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

/** Hàng riêng của Tạp Hoá Bà Bảy (ngoài 10 mặt hàng chung ở trên) – mỗi sản phẩm có ảnh thật cùng slug */
const baBayProducts: Seed[] = [
  // Rau củ & Trái cây
  { name: 'Rau muống', category: 'Rau củ & Trái cây', brand: 'Vườn nhà', unit: 'bó', description: 'Rau muống tươi hái mỗi sáng, giòn ngọt – luộc, xào tỏi đều ngon.', ...opt('Khối lượng', [['300g', 9000, 40], ['500g', 14000, 30]]) },
  { name: 'Cà chua', category: 'Rau củ & Trái cây', brand: 'Đà Lạt', unit: 'kg', photos: 2, description: 'Cà chua Đà Lạt chín đỏ, mọng nước.', ...opt('Khối lượng', [['500g', 18000, 35], ['1kg', 34000, 20]]) },
  { name: 'Cà rốt Đà Lạt', category: 'Rau củ & Trái cây', brand: 'Đà Lạt', unit: 'kg', description: 'Cà rốt Đà Lạt củ to, ngọt, giàu vitamin A.', ...opt('Khối lượng', [['500g', 15000, 30], ['1kg', 28000, 18]]) },
  { name: 'Tỏi khô', category: 'Rau củ & Trái cây', brand: 'Nông sản Việt', unit: 'gói', description: 'Tỏi khô củ chắc, thơm nồng – gia vị không thể thiếu trong bếp.', ...opt('Khối lượng', [['250g', 22000, 40], ['500g', 42000, 20]]) },
  { name: 'Chanh không hạt', category: 'Rau củ & Trái cây', brand: 'Long An', unit: 'kg', description: 'Chanh không hạt Long An nhiều nước, vỏ mỏng.', ...opt('Khối lượng', [['500g', 20000, 30], ['1kg', 38000, 15]]) },
  { name: 'Chuối già', category: 'Rau củ & Trái cây', brand: 'Bến Tre', unit: 'nải', description: 'Chuối già Nam Mỹ chín tự nhiên, ngọt thơm.', options: [], variants: one(32000, 25) },
  { name: 'Xoài cát Hòa Lộc', category: 'Rau củ & Trái cây', brand: 'Tiền Giang', unit: 'kg', featured: true, description: 'Xoài cát Hòa Lộc đặc sản Tiền Giang – thịt vàng, dẻo, ngọt lịm.', ...opt('Khối lượng', [['1kg', 85000, 20, 95000], ['2kg', 165000, 8]]) },
  { name: 'Thanh long ruột trắng', category: 'Rau củ & Trái cây', brand: 'Bình Thuận', unit: 'kg', description: 'Thanh long Bình Thuận trái to, ngọt mát.', options: [], variants: one(30000, 30) },
  // Thịt, cá & Hải sản
  { name: 'Sườn non heo', category: 'Thịt, cá & Hải sản', brand: 'MEATDeli', unit: 'khay', description: 'Sườn non heo tươi – rim, nướng, nấu canh chua.', ...opt('Khối lượng', [['300g', 72000, 15], ['500g', 118000, 10]]) },
  { name: 'Thịt bò Mỹ thái lát', category: 'Thịt, cá & Hải sản', brand: 'Bò Mỹ', unit: 'khay', featured: true, description: 'Ba chỉ bò Mỹ thái lát mỏng – nhúng lẩu, nướng.', ...opt('Khối lượng', [['250g', 89000, 15], ['500g', 169000, 8, 179000]]) },
  { name: 'Ức gà phi lê', category: 'Thịt, cá & Hải sản', brand: 'CP', unit: 'khay', description: 'Ức gà phi lê không da, ít mỡ – món ăn healthy.', ...opt('Khối lượng', [['500g', 49000, 20], ['1kg', 95000, 10]]) },
  { name: 'Cá basa phi lê', category: 'Thịt, cá & Hải sản', brand: 'Đồng bằng sông Cửu Long', unit: 'khay', description: 'Cá basa phi lê trắng, không xương – chiên, kho, nấu canh.', ...opt('Khối lượng', [['500g', 45000, 18], ['1kg', 85000, 8]]) },
  { name: 'Tôm thẻ bóc nõn', category: 'Thịt, cá & Hải sản', brand: 'Cà Mau', unit: 'khay', description: 'Tôm thẻ Cà Mau bóc vỏ sẵn, tiện nấu nướng.', ...opt('Khối lượng', [['200g', 79000, 12], ['500g', 185000, 6]]) },
  // Trứng
  { name: 'Trứng gà', category: 'Trứng', brand: 'Ba Huân', unit: 'hộp', featured: true, photos: 2, description: 'Trứng gà tươi sạch, vỏ chắc, lòng đỏ đậm.', ...opt('Quy cách', [['Hộp 6 quả', 21000, 40], ['Hộp 10 quả', 34000, 30], ['Vỉ 30 quả', 96000, 10, 102000]]) },
  // Đồ hộp & Đồ khô chế biến
  { name: 'Heo hầm Vissan', category: 'Đồ hộp & Đồ khô chế biến', brand: 'Vissan', unit: 'lon', description: 'Thịt heo hầm đóng hộp Vissan, tiện lợi cho bữa cơm nhanh.', options: [], variants: one(32000, 40) },
  { name: 'Lạp xưởng Mai Quế Lộ Vissan', category: 'Đồ hộp & Đồ khô chế biến', brand: 'Vissan', unit: 'gói', description: 'Lạp xưởng mai quế lộ thơm ngọt, chiên hay hấp cơm đều ngon.', ...opt('Khối lượng', [['200g', 65000, 25], ['500g', 155000, 10]]) },
  // Gạo, mì & Thực phẩm khô
  { name: 'Mì Omachi xốt Spaghetti', category: 'Gạo, mì & Thực phẩm khô', brand: 'Omachi', unit: 'gói', description: 'Mì khoai tây Omachi trộn xốt spaghetti bò bằm.', ...opt('Quy cách', [['Gói lẻ', 8500, 120], ['Thùng 30 gói', 245000, 8]]) },
  { name: 'Mì Cung Đình Kool', category: 'Gạo, mì & Thực phẩm khô', brand: 'Cung Đình', unit: 'gói', description: 'Mì Cung Đình Kool vị cay nồng hấp dẫn.', ...opt('Quy cách', [['Gói lẻ', 7500, 100], ['Thùng 30 gói', 215000, 6]]) },
  { name: 'Phở bò Vifon', category: 'Gạo, mì & Thực phẩm khô', brand: 'Vifon', unit: 'gói', description: 'Phở bò ăn liền Vifon, sợi phở dai, nước dùng đậm đà.', ...opt('Quy cách', [['Gói lẻ', 9000, 90], ['Thùng 30 gói', 255000, 5]]) },
  { name: 'Phở gà Vifon (tô)', category: 'Gạo, mì & Thực phẩm khô', brand: 'Vifon', unit: 'tô', description: 'Phở gà ăn liền Vifon dạng tô, tiện mang đi.', options: [], variants: one(16000, 48) },
  { name: 'Mì Vifon hương vị bò', category: 'Gạo, mì & Thực phẩm khô', brand: 'Vifon', unit: 'gói', description: 'Mì ăn liền Vifon hương vị bò truyền thống.', ...opt('Quy cách', [['Gói lẻ', 5000, 150], ['Thùng 30 gói', 138000, 10]]) },
  { name: 'Bánh phở khô Oh! Ricey', category: 'Gạo, mì & Thực phẩm khô', brand: 'Acecook', unit: 'gói', description: 'Bánh phở khô Oh! Ricey 500g, nấu phở tại nhà.', options: [], variants: one(32000, 30) },
  { name: 'Mì A-One kim chi tôm', category: 'Gạo, mì & Thực phẩm khô', brand: 'A-One', unit: 'gói', description: 'Mì A-One vị kim chi tôm chua cay.', ...opt('Quy cách', [['Gói lẻ', 4000, 120], ['Thùng 30 gói', 110000, 8]]) },
  // Gia vị
  { name: 'Hạt nêm Knorr', category: 'Gia vị', brand: 'Knorr', unit: 'gói', description: 'Hạt nêm Knorr từ thịt thăn, xương ống & tủy.', ...opt('Khối lượng', [['400g', 39000, 40], ['900g', 82000, 20, 88000]]) },
  { name: 'Hạt nêm Aji-ngon', category: 'Gia vị', brand: 'Ajinomoto', unit: 'gói', description: 'Hạt nêm Aji-ngon vị heo, đậm đà vị nấm.', ...opt('Khối lượng', [['400g', 36000, 40], ['900g', 76000, 20]]) },
  { name: 'Nước tương Chin-su', category: 'Gia vị', brand: 'Chin-su', unit: 'chai', photos: 2, description: 'Nước tương Chin-su lên men tự nhiên.', ...opt('Loại', [['Nguyên bản', 19000, 40], ['Tỏi ớt', 21000, 35]]) },
  { name: 'Nước tương Tam Thái Tử', category: 'Gia vị', brand: 'Chin-su', unit: 'chai', description: 'Nước tương Tam Thái Tử Nhất Ca 500ml – giá tốt cho mọi nhà.', options: [], variants: one(15000, 50) },
  { name: 'Nước tương Phú Sĩ', category: 'Gia vị', brand: 'Ajinomoto', unit: 'chai', description: 'Nước tương Phú Sĩ phong cách Nhật, vị dịu.', options: [], variants: one(24000, 30) },
  { name: 'Tương cà Chin-su', category: 'Gia vị', brand: 'Chin-su', unit: 'chai', description: 'Tương cà Chin-su từ cà chua tươi, chấm khoai tây chiên tuyệt vời.', ...opt('Khối lượng', [['250g', 14000, 40], ['500g', 24000, 25]]) },
  { name: 'Tương ớt Cholimex', category: 'Gia vị', brand: 'Cholimex', unit: 'chai', description: 'Tương ớt Cholimex cay vừa, thơm vị ớt tươi.', ...opt('Khối lượng', [['270g', 13000, 40], ['830g', 32000, 15]]) },
  { name: 'Dầu hào Maggi', category: 'Gia vị', brand: 'Maggi', unit: 'chai', description: 'Dầu hào Maggi đậm đặc, xào rau thịt thơm ngon.', ...opt('Khối lượng', [['350g', 28000, 30], ['530g', 40000, 20]]) },
  { name: 'Dầu đậu nành Simply', category: 'Gia vị', brand: 'Simply', unit: 'chai', description: 'Dầu đậu nành nguyên chất Simply, tốt cho tim mạch.', ...opt('Dung tích', [['1L', 62000, 30], ['2L', 120000, 15, 128000]]) },
  // Đồ uống
  { name: 'Pepsi', category: 'Đồ uống', brand: 'Pepsi', unit: 'lon', photos: 2, description: 'Nước ngọt có ga Pepsi – sảng khoái tức thì.', ...opt('Loại', [['Nguyên bản', 10000, 120], ['Không calo', 10500, 60]]) },
  { name: 'Sprite', category: 'Đồ uống', brand: 'Sprite', unit: 'lon', description: 'Nước ngọt Sprite vị chanh tươi mát.', ...opt('Quy cách', [['Lon 320ml', 10000, 100], ['Lốc 6 lon', 57000, 15]]) },
  { name: 'Fanta', category: 'Đồ uống', brand: 'Fanta', unit: 'chai', photos: 2, description: 'Nước ngọt Fanta chai 390ml.', ...opt('Hương vị', [['Nho', 10000, 60], ['Xá xị', 10000, 60]]) },
  { name: 'Nước tăng lực Sting', category: 'Đồ uống', brand: 'Sting', unit: 'lon', photos: 2, description: 'Nước tăng lực Sting hương hồng sâm, bổ sung năng lượng.', ...opt('Quy cách', [['Lon 320ml', 11000, 120], ['Lốc 6 lon', 63000, 20]]) },
  { name: 'Trà C2', category: 'Đồ uống', brand: 'URC', unit: 'chai', photos: 2, description: 'Trà xanh C2 chai 455ml, thanh mát.', ...opt('Vị', [['Đào', 9000, 80], ['Chanh', 9000, 80]]) },
  { name: 'Trà Lipton chanh', category: 'Đồ uống', brand: 'Lipton', unit: 'chai', description: 'Trà đen Lipton vị chanh, giải khát tức thì.', options: [], variants: one(10000, 60) },
  { name: 'Nước tinh khiết Aquafina', category: 'Đồ uống', brand: 'Aquafina', unit: 'chai', description: 'Nước uống tinh khiết Aquafina.', ...opt('Quy cách', [['500ml', 5000, 200], ['1.5L', 10000, 80], ['Thùng 24 chai 500ml', 105000, 10]]) },
  { name: 'Nước khoáng La Vie', category: 'Đồ uống', brand: 'La Vie', unit: 'chai', description: 'Nước khoáng thiên nhiên La Vie.', ...opt('Quy cách', [['500ml', 5000, 150], ['1.5L', 10000, 60]]) },
  { name: 'Nước dừa Wonderfarm', category: 'Đồ uống', brand: 'Wonderfarm', unit: 'lon', description: 'Nước dừa tươi Wonderfarm có cơm dừa, lon 310ml.', ...opt('Quy cách', [['Lon', 11000, 80], ['Lốc 6 lon', 62000, 12]]) },
  // Cà phê & Trà
  { name: 'Cà phê G7 3in1', category: 'Cà phê & Trà', brand: 'Trung Nguyên', unit: 'hộp', featured: true, description: 'Cà phê hoà tan G7 3in1 – đậm đà vị cà phê Việt.', ...opt('Quy cách', [['Hộp 18 gói', 58000, 30], ['Bịch 50 gói', 155000, 12, 165000]]) },
  { name: 'Nescafé Café Việt', category: 'Cà phê & Trà', brand: 'Nescafé', unit: 'hộp', description: 'Cà phê đen đá hoà tan Nescafé Café Việt.', options: [], variants: one(52000, 25) },
  { name: 'Cà phê Sáng Tạo 2 Trung Nguyên', category: 'Cà phê & Trà', brand: 'Trung Nguyên', unit: 'gói', description: 'Cà phê rang xay Sáng Tạo 2 Trung Nguyên 340g, pha phin.', options: [], variants: one(85000, 20) },
  // Sữa
  { name: 'Sữa tươi TH true MILK', category: 'Sữa & Sản phẩm từ sữa', brand: 'TH true MILK', unit: 'hộp', photos: 2, description: 'Sữa tươi tiệt trùng TH true MILK ít đường.', ...opt('Quy cách', [['Lốc 4 hộp 180ml', 36000, 50], ['Hộp 1L', 38000, 20]]) },
  { name: 'Sữa đặc Ông Thọ', category: 'Sữa & Sản phẩm từ sữa', brand: 'Vinamilk', unit: 'hộp', description: 'Sữa đặc có đường Ông Thọ 380g – pha cà phê sữa đá.', options: [], variants: one(28000, 60) },
  { name: 'Sữa chua Vinamilk', category: 'Sữa & Sản phẩm từ sữa', brand: 'Vinamilk', unit: 'lốc', description: 'Sữa chua ăn Vinamilk lốc 4 hộp.', ...opt('Vị', [['Dâu', 28000, 30], ['Có đường', 26000, 30]]) },
  { name: 'Sữa lúa mạch Milo', category: 'Sữa & Sản phẩm từ sữa', brand: 'Nestlé', unit: 'lốc', description: 'Thức uống lúa mạch Milo Active-Go hộp 180ml.', ...opt('Quy cách', [['Lốc 4 hộp 180ml', 30000, 40], ['Thùng 48 hộp', 345000, 5]]) },
  { name: 'Sữa uống lên men Yakult', category: 'Sữa & Sản phẩm từ sữa', brand: 'Yakult', unit: 'lốc', description: 'Sữa uống lên men Yakult lốc 5 chai, tốt cho tiêu hoá.', options: [], variants: one(25000, 40) },
  // Bánh kẹo & Snack
  { name: 'Bánh Oreo', category: 'Bánh kẹo & Snack', brand: 'Oreo', unit: 'gói', description: 'Bánh quy kem Oreo vị vani.', ...opt('Quy cách', [['Gói 133g', 20000, 40], ['Gói 266g', 38000, 25]]) },
  { name: 'Bánh Oreo Socola Pie', category: 'Bánh kẹo & Snack', brand: 'Oreo', unit: 'hộp', description: 'Bánh Oreo Socola Pie hộp 12 cái.', options: [], variants: one(60000, 20) },
  { name: 'Snack Poca bò lúc lắc', category: 'Bánh kẹo & Snack', brand: 'Poca', unit: 'gói', description: 'Snack Poca vị bò lúc lắc giòn rụm.', ...opt('Khối lượng', [['54g', 12000, 50], ['90g', 19000, 30]]) },
  { name: 'Bánh gạo One One', category: 'Bánh kẹo & Snack', brand: 'One One', unit: 'gói', description: 'Bánh gạo One One vị ngọt dịu.', ...opt('Khối lượng', [['150g', 24000, 30], ['230g', 35000, 20]]) },
  { name: 'Kẹo Alpenliebe', category: 'Bánh kẹo & Snack', brand: 'Alpenliebe', unit: 'hũ', description: 'Kẹo sữa caramen Alpenliebe hũ 87 viên.', options: [], variants: one(52000, 15) },
  { name: 'Bánh bông lan Solite', category: 'Bánh kẹo & Snack', brand: 'Kinh Đô', unit: 'hộp', description: 'Bánh bông lan cuộn Solite vị dâu hộp 360g.', options: [], variants: one(49000, 20) },
  { name: 'Snack Kinh Đô vị cua', category: 'Bánh kẹo & Snack', brand: 'Kinh Đô', unit: 'gói', description: 'Snack Kinh Đô vị cua – món ăn vặt tuổi thơ.', options: [], variants: one(6000, 80) },
  // Hoá phẩm & Chăm sóc cá nhân
  { name: 'Nước xả vải Comfort', category: 'Hoá phẩm & Chăm sóc nhà cửa', brand: 'Comfort', unit: 'chai', description: 'Nước xả vải Comfort hương ban mai, mềm vải thơm lâu.', ...opt('Dung tích', [['800ml', 59000, 25], ['1.6L', 105000, 12]]) },
  { name: 'Xà bông Lifebuoy', category: 'Chăm sóc cá nhân', brand: 'Lifebuoy', unit: 'bánh', description: 'Xà bông Lifebuoy chanh, bảo vệ khỏi vi khuẩn.', ...opt('Quy cách', [['Bánh 90g', 16000, 50], ['Lốc 3 bánh', 45000, 20]]) },
  { name: 'Dầu gội Sunsilk', category: 'Chăm sóc cá nhân', brand: 'Sunsilk', unit: 'dây', description: 'Dầu gội Sunsilk óng mượt rạng ngời (Black Shine).', ...opt('Quy cách', [['Dây 10 gói', 15000, 40], ['Chai 320g', 85000, 15]]) },
  { name: 'Bàn chải Colgate', category: 'Chăm sóc cá nhân', brand: 'Colgate', unit: 'cái', description: 'Bàn chải đánh răng Colgate Extra Clean lông mềm.', options: [], variants: one(15000, 60) },
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
        thumbnail: photos(slugify(p.name))[0], images: photos(slugify(p.name), p.photos ?? 1),
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
 * DB cũ: sản phẩm demo còn ảnh giả (picsum ngẫu nhiên hoặc SVG minh hoạ) → đổi sang ảnh chụp thật.
 * Chỉ đụng tới sản phẩm còn nguyên ảnh demo (chủ cửa hàng đã tự đổi ảnh thì giữ nguyên).
 */
async function upgradeDemoImages() {
  const picsum = /^https:\/\/picsum\.photos\/seed\/([a-z0-9-]+)\/600\/600$/;
  const svg = /^\/products\/([a-z0-9-]+)\.svg$/;
  const demoKey = (u: string | null) => u?.match(picsum)?.[1] ?? u?.match(svg)?.[1];
  let n = 0;
  const list = await prisma.product.findMany({
    where: { OR: [{ thumbnail: { startsWith: 'https://picsum.photos/seed/' } }, { thumbnail: { startsWith: '/products/', endsWith: '.svg' } }] },
    select: { id: true, storeId: true, thumbnail: true },
  });
  for (const p of list) {
    const key = demoKey(p.thumbnail);
    const up = key && DEMO_UPGRADE[key];
    if (!up) continue;
    const r = up.rename;
    const slug = r?.slug ?? key;
    const data: Record<string, unknown> = { thumbnail: photos(slug)[0], images: photos(slug, up.photos) };
    if (r && !(await prisma.product.findFirst({ where: { storeId: p.storeId, slug: r.slug } }))) Object.assign(data, r);
    await prisma.product.update({ where: { id: p.id }, data });
    n++;
  }
  // Ảnh danh mục picsum cũ → ảnh danh mục SVG
  for (const c of await prisma.category.findMany({ where: { image: { startsWith: 'https://picsum.photos/seed/' } }, select: { id: true, image: true } })) {
    const seed = c.image?.match(picsum)?.[1];
    if (seed && ['veg', 'meat', 'drink', 'milk', 'rice', 'spice', 'snack', 'clean'].includes(seed)) {
      await prisma.category.update({ where: { id: c.id }, data: { image: img(`cat-${seed}`) } });
      n++;
    }
  }
  if (n) console.log(`🖼  Đã thay ${n} ảnh demo cũ bằng ảnh chụp thật đúng mặt hàng`);
}

const HCM = { provinceCode: 79, provinceName: 'Thành phố Hồ Chí Minh' };
const HCM_Q3 = { street: '212 Cách Mạng Tháng Tám', ...HCM, districtCode: 770, districtName: 'Quận 3', wardCode: 27133, wardName: 'Phường 11' };

/** Cửa hàng Tạp Hoá Bà Bảy (Q.3): ~70 mặt hàng ảnh thật, phí ship riêng 18k / freeship từ 200k */
async function seedBaBay(planId: number, superAdminId: number | null) {
  const pwd = await bcrypt.hash('123456', 10);
  const address = '212 Cách Mạng Tháng Tám, Phường 11, Quận 3, Thành phố Hồ Chí Minh';
  const store = await prisma.store.create({
    data: {
      slug: 'tap-hoa-ba-bay', name: 'Tạp Hoá Bà Bảy', phone: '0909 777 888', address, ...HCM_Q3, planId, planExpiresAt: monthsFromNow(6), lat: 10.7838, lng: 106.6796,
      businessName: 'Hộ kinh doanh Lê Thị Bảy', businessType: 'HKD', taxCode: '8034567890', businessAddress: address, businessAddressParts: HCM_Q3,
      representative: 'Lê Thị Bảy', representativeId: '079168007777', representativePhone: '0909777888',
      bankName: 'Techcombank', bankAccountNo: '0909777888', bankAccountName: 'LE THI BAY', contractNo: 'HD-2026-003', contractSignedAt: new Date(),
    },
  });
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  await prisma.storePayment.create({
    data: { storeId: store.id, planId, months: 6, amount: (plan?.priceMonthly ?? 0) * 6, periodFrom: new Date(), periodTo: store.planExpiresAt!, method: 'Chuyển khoản', note: 'Đăng ký ban đầu', createdById: superAdminId },
  });
  for (const u of [
    { email: 'owner3@grocery.local', fullName: 'Bà Bảy', role: 'ADMIN' as const },
    { email: 'staff3@grocery.local', fullName: 'Nhân viên Bà Bảy', role: 'STAFF' as const },
  ])
    if (!(await prisma.user.findUnique({ where: { email: u.email } }))) await prisma.user.create({ data: { ...u, password: pwd, storeId: store.id } });

  await prisma.setting.create({
    data: {
      storeId: store.id, key: 'store',
      value: {
        storeName: store.name, slogan: 'Đi chợ giùm bạn – rau thịt cá tươi mỗi sáng', hotline: store.phone, address,
        announcement: '🥬 Rau, thịt, cá tươi về mỗi sáng · Miễn phí ship đơn từ 200.000₫', freeShippingThreshold: 200000, shippingFee: 18000,
        payment: { cod: true, bankTransfer: true, vnpay: false },
        bank: { bankBin: '970407', bankName: 'Techcombank', accountNo: '0909777888', accountName: 'LE THI BAY' }, banners: [],
      },
    },
  });
  await fillBaBay(store.id);
  return store;
}

/**
 * Hàng hoá mẫu cho Bà Bảy – chỉ điền phần còn trống (danh mục/sản phẩm, NCC, mã giảm giá),
 * không đụng tới thông tin cửa hàng, tài khoản hay cài đặt đã có.
 */
async function fillBaBay(storeId: number) {
  const done: string[] = [];
  if (!(await prisma.product.count({ where: { storeId } })) && !(await prisma.category.count({ where: { storeId } }))) {
    barcodeSeq = 300001; // dải mã vạch riêng của cửa hàng
    await seedCatalog(storeId, [...products, ...baBayProducts]);
    done.push(`${products.length + baBayProducts.length} sản phẩm`);
  }
  if (!(await prisma.supplier.count({ where: { storeId } }))) {
    await prisma.supplier.createMany({
      data: [
        { storeId, name: 'Vựa rau củ Chợ đầu mối Bình Điền', contactName: 'Cô Ba', phone: '0283756111', address: 'Chợ Bình Điền, Quận 8, TP.HCM' },
        { storeId, name: 'Đại lý nước giải khát Bảy Hùng', contactName: 'Anh Hùng', phone: '0909123456', address: '18 Võ Văn Tần, Quận 3, TP.HCM' },
      ],
    });
    done.push('2 nhà cung cấp');
  }
  if (!(await prisma.coupon.count({ where: { storeId } }))) {
    await prisma.coupon.createMany({
      data: [
        { storeId, code: 'WELCOME10', description: 'Giảm 10% tối đa 50k cho đơn từ 100k', type: 'PERCENT', value: 10, minOrderValue: 100000, maxDiscount: 50000 },
        { storeId, code: 'BABAY10', description: 'Giảm 10% tối đa 30k cho đơn từ 150k', type: 'PERCENT', value: 10, minOrderValue: 150000, maxDiscount: 30000 },
        { storeId, code: 'BABAY15K', description: 'Giảm 15k cho đơn từ 250k', type: 'FIXED', value: 15000, minOrderValue: 250000, usageLimit: 200 },
      ],
    });
    done.push('3 mã giảm giá');
  }
  return done;
}

/**
 * DB local đã có dữ liệu: cửa hàng Bà Bảy đã tạo (từ /super) nhưng chưa có hàng → điền hàng mẫu;
 * chưa có cửa hàng (và đang ở chế độ demo) → tạo mới. Không bao giờ xoá dữ liệu; bỏ qua trên production.
 */
async function ensureBaBay() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return;
  const existing = await prisma.store.findUnique({ where: { slug: 'tap-hoa-ba-bay' } });
  if (existing) {
    const done = await fillBaBay(existing.id);
    if (done.length) console.log(`✅ Đã điền dữ liệu mẫu cho ${existing.name} (/s/tap-hoa-ba-bay): ${done.join(', ')}`);
    return;
  }
  if (process.env.SEED_ADMIN_PASSWORD) return; // môi trường thật: không tự tạo cửa hàng demo
  const plan = (await prisma.plan.findUnique({ where: { code: 'basic' } })) ?? (await prisma.plan.findFirst({ orderBy: { sortOrder: 'desc' } }));
  if (!plan) return;
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  await seedBaBay(plan.id, superAdmin?.id ?? null);
  console.log('✅ Đã thêm cửa hàng mẫu Tạp Hoá Bà Bảy (/s/tap-hoa-ba-bay): owner3@grocery.local, staff3@grocery.local / 123456');
}

/**
 * DB cũ (nâng cấp từ bản 1 cửa hàng) chưa có super admin → tạo tài khoản mặc định để vào /super.
 * Production: chỉ tạo khi có SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD.
 */
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

/** Gói mua thêm mẫu (giá đã gồm thuế) – super admin chỉnh tại /super/addons */
const ADDON_PACKS = [
  { code: 'them-30-san-pham', name: 'Thêm 30 sản phẩm', description: 'Mở rộng danh mục hàng hoá, dùng không thời hạn', kind: 'products', quantity: 30, price: 150000, months: 0, sortOrder: 1 },
  { code: 'them-100-san-pham', name: 'Thêm 100 sản phẩm', description: 'Tiết kiệm 35% so với mua lẻ gói 30 sản phẩm', kind: 'products', quantity: 100, price: 390000, months: 0, sortOrder: 2 },
  { code: 'them-500-san-pham', name: 'Thêm 500 sản phẩm', description: 'Cho cửa hàng mở rộng ngành hàng lớn', kind: 'products', quantity: 500, price: 1490000, months: 0, sortOrder: 3 },
  { code: 'them-200-don-hang', name: 'Thêm 200 đơn hàng/tháng', description: 'Cộng thêm 200 đơn mỗi tháng trong 1 tháng', kind: 'ordersMonthly', quantity: 200, price: 99000, months: 1, sortOrder: 10 },
  { code: 'them-1000-don-hang', name: 'Thêm 1.000 đơn hàng/tháng', description: 'Cho mùa cao điểm, lễ Tết', kind: 'ordersMonthly', quantity: 1000, price: 390000, months: 1, sortOrder: 11 },
  { code: 'them-1-nhan-vien', name: 'Thêm 1 tài khoản nhân viên', description: 'Thêm 1 nhân viên bán hàng / kho trong 1 tháng', kind: 'staff', quantity: 1, price: 49000, months: 1, sortOrder: 20 },
  { code: 'them-5-nhan-vien', name: 'Thêm 5 tài khoản nhân viên', description: 'Thêm 5 nhân viên trong 1 tháng', kind: 'staff', quantity: 5, price: 199000, months: 1, sortOrder: 21 },
  { code: 'them-5-chien-dich', name: 'Thêm 5 chiến dịch marketing/tháng', description: 'Gửi thêm 5 chiến dịch khuyến mãi mỗi tháng trong 1 tháng', kind: 'campaignsMonthly', quantity: 5, price: 99000, months: 1, sortOrder: 30 },
];

/** DB cũ: bổ sung gói Miễn phí (mặc định cho đối tác mới) & gói mua thêm mẫu nếu chưa có */
async function ensurePlansAndAddons() {
  if (!(await prisma.plan.findUnique({ where: { code: 'free' } })))
    await prisma.plan.create({ data: { code: 'free', name: 'Miễn phí', description: 'Gói mặc định cho đối tác mới – không thời hạn, có thể mua thêm hạn mức hoặc nâng cấp bất cứ lúc nào', priceMonthly: 0, maxProducts: 30, maxStaff: 1, maxOrdersMonthly: 100, features: ['COUPONS'], sortOrder: 1 } });
  if (!(await prisma.addonPack.count())) await prisma.addonPack.createMany({ data: ADDON_PACKS, skipDuplicates: true });
}

async function main() {
  // An toàn cho CI/CD: chỉ seed khi DB trống, trừ khi FORCE_SEED=true (xoá sạch & seed lại)
  const force = process.env.FORCE_SEED === 'true';
  if (!force && (await prisma.user.count()) > 0) {
    console.log('ℹ️  DB đã có dữ liệu → bỏ qua seed (đặt FORCE_SEED=true để seed lại từ đầu)');
    await ensureSuperAdmin();
    await ensurePlansAndAddons();
    await upgradeDemoImages();
    await ensureBaBay();
    return;
  }
  if (force && process.env.VERCEL_ENV === 'production') throw new Error('Không cho phép FORCE_SEED trên production');
  console.log('🌱 Seeding...');
  await prisma.posLoyaltyToken.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.address.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.storePayment.deleteMany();
  await prisma.storePurchase.deleteMany();
  await prisma.user.deleteMany();
  await prisma.stockDocument.deleteMany(); // dòng phiếu kho chặn xoá biến thể (Restrict)
  await prisma.store.deleteMany(); // cascade: danh mục, sản phẩm, mã giảm giá, NCC, phiếu kho, cài đặt
  await prisma.plan.deleteMany();

  // Gói dịch vụ
  const [free, basic, pro] = await Promise.all([
    prisma.plan.create({ data: { code: 'free', name: 'Miễn phí', description: 'Gói mặc định cho đối tác mới – không thời hạn, có thể mua thêm hạn mức hoặc nâng cấp bất cứ lúc nào', priceMonthly: 0, maxProducts: 30, maxStaff: 1, maxOrdersMonthly: 100, features: ['COUPONS'], sortOrder: 1 } }),
    prisma.plan.create({ data: { code: 'basic', name: 'Cơ bản', description: 'Cửa hàng tạp hoá vừa', priceMonthly: 199000, maxProducts: 1000, maxStaff: 5, maxOrdersMonthly: 2000, maxCampaignsMonthly: 5, auditRetentionDays: 30, features: ['RETURNS', 'LOYALTY', 'COUPONS', 'ADVANCED_PROMOTIONS'], sortOrder: 2 } }),
    prisma.plan.create({ data: { code: 'pro', name: 'Chuyên nghiệp', description: 'Không giới hạn sản phẩm & nhân viên', priceMonthly: 499000, maxProducts: null, maxStaff: null, maxOrdersMonthly: null, maxCampaignsMonthly: null, auditRetentionDays: null, features: ['RETURNS', 'RECONCILIATION', 'LOYALTY', 'ADVANCED_PROMOTIONS', 'COUPONS', 'CRM', 'AUDIT_LOG'], sortOrder: 3 } }),
  ]);
  await prisma.addonPack.createMany({ data: ADDON_PACKS, skipDuplicates: true });

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
  // Địa chỉ hành chính (mã theo danh mục Tỉnh/Huyện/Xã ở src/geo)
  const HCM_Q1 = { street: '123 Lê Lợi', ...HCM, districtCode: 760, districtName: 'Quận 1', wardCode: 26740, wardName: 'Phường Bến Nghé' };
  const HCM_Q5 = { street: '45 Nguyễn Trãi', ...HCM, districtCode: 774, districtName: 'Quận 5', wardCode: 27307, wardName: 'Phường 2' };
  // Cửa hàng 1: đầy đủ sản phẩm
  const s1 = await prisma.store.create({
    data: { slug: 'tap-hoa-xanh', name: 'Tạp Hoá Xanh', phone: '1900 1234', address: '123 Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh', ...HCM_Q1, planId: pro.id, planExpiresAt: monthsFromNow(12), lat: 10.7743, lng: 106.7009,
      businessName: 'Công ty TNHH Tạp Hoá Xanh', businessType: 'CONG_TY', taxCode: '0312345678', businessAddress: '123 Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh', businessAddressParts: HCM_Q1,
      representative: 'Trần Văn Xanh', representativeId: '079088001234', representativePhone: '0903111222',
      bankName: 'Vietcombank', bankAccountNo: '1234567890', bankAccountName: 'CONG TY TNHH TAP HOA XANH', contractNo: 'HD-2026-001', contractSignedAt: new Date() },
  });
  // Cửa hàng 2: ít sản phẩm, giá khác, gói cơ bản
  const s2 = await prisma.store.create({
    data: { slug: 'tap-hoa-ba-nam', name: 'Tạp Hoá Bà Năm', phone: '0908 555 666', address: '45 Nguyễn Trãi, Phường 2, Quận 5, Thành phố Hồ Chí Minh', ...HCM_Q5, planId: basic.id, planExpiresAt: monthsFromNow(1), lat: 10.7569, lng: 106.6826,
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
      { email: 'lan.nguyen@grocery.local', password: pwd, fullName: 'Nguyễn Thị Lan', phone: '0912345678', address: '28 Nguyễn Huệ, Quận 1, TP.HCM' },
      { email: 'minh.tran@grocery.local', password: pwd, fullName: 'Trần Quốc Minh', phone: '0987654321', address: '75 Võ Văn Tần, Quận 3, TP.HCM' },
      { email: 'thuy.le@grocery.local', password: pwd, fullName: 'Lê Thanh Thúy', phone: '0909888777', address: '16 Trần Hưng Đạo, Quận 5, TP.HCM' },
    ],
  });
  // Tài xế giao hàng của sàn
  await prisma.user.create({
    data: {
      email: 'shipper@grocery.local', password: pwd, fullName: 'Trần Văn Tài', phone: '0938111222', role: 'SHIPPER',
      shipperProfile: { create: { vehicleType: 'XE_MAY', plateNumber: '59X1-234.56', area: 'Quận 1, Thành phố Hồ Chí Minh; Quận 3, Thành phố Hồ Chí Minh; Quận 5, Thành phố Hồ Chí Minh',
        areas: [760, 770, 774].map((code, i) => ({ ...HCM, districtCode: code, districtName: ['Quận 1', 'Quận 3', 'Quận 5'][i], wardCode: null, wardName: null })),
        lat: 10.7769, lng: 106.6953 } },
    },
  });

  await seedCatalog(s1.id, products);
  await seedCatalog(s2.id, products.filter((p) => ['Mì Hảo Hảo', 'Coca-Cola', 'Nước mắm Chin-su', 'Bánh Choco-Pie Orion', "Snack khoai tây Lay's"].includes(p.name)), 1.05);

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
      { storeId: s1.id, code: 'WELCOME10', description: 'Giảm 10% tối đa 50k cho đơn từ 100k', type: 'PERCENT', value: 10, minOrderValue: 100000, maxDiscount: 50000, audienceAll: true },
      { storeId: s1.id, code: 'GIAM20K', description: 'Giảm 20k cho đơn từ 200k', type: 'FIXED', value: 20000, minOrderValue: 200000, usageLimit: 100, audienceAll: true },
      { storeId: s2.id, code: 'BANAM5K', description: 'Giảm 5k cho đơn từ 50k', type: 'FIXED', value: 5000, minOrderValue: 50000, audienceAll: true },
    ],
  });
  // Dữ liệu mẫu CRM: khách hàng, đơn đã mua, ví điểm, lịch sử điểm và voucher riêng.
  const sampleCustomers = await prisma.user.findMany({ where: { email: { in: ['customer@grocery.local', 'lan.nguyen@grocery.local', 'minh.tran@grocery.local', 'thuy.le@grocery.local'] } } });
  const customerSamples = [
    { user: sampleCustomers.find((u) => u.email === 'customer@grocery.local')!, total: 1250000, points: 980, lifetime: 1250, tier: 'SILVER', orders: 4 },
    { user: sampleCustomers.find((u) => u.email === 'lan.nguyen@grocery.local')!, total: 5680000, points: 4210, lifetime: 5680, tier: 'GOLD', orders: 8 },
    { user: sampleCustomers.find((u) => u.email === 'minh.tran@grocery.local')!, total: 780000, points: 630, lifetime: 780, tier: 'BRONZE', orders: 3 },
    { user: sampleCustomers.find((u) => u.email === 'thuy.le@grocery.local')!, total: 10850000, points: 8920, lifetime: 10850, tier: 'DIAMOND', orders: 12 },
  ];
  for (const [i, sample] of customerSamples.entries()) {
    const createdAt = new Date(Date.now() - (i + 1) * 86400000);
    let lastOrderId = 0;
    for (let j = 0; j < sample.orders; j++) {
      const amount = j === sample.orders - 1 ? sample.total - Math.floor(sample.total / sample.orders) * (sample.orders - 1) : Math.floor(sample.total / sample.orders);
      const boughtAt = new Date(createdAt.getTime() - j * 7 * 86400000);
      const order = await prisma.order.create({ data: { code: `HDMAU${i + 1}${String(j + 1).padStart(2, '0')}`, storeId: s1.id, userId: sample.user.id, channel: j % 2 ? 'ONLINE' : 'POS', customerName: sample.user.fullName, phone: sample.user.phone || '', address: j % 2 ? sample.user.address || 'Địa chỉ khách hàng' : 'Mua tại cửa hàng', status: 'COMPLETED', paymentMethod: j % 2 ? 'COD' : 'CASH', paymentStatus: 'PAID', paidAt: boughtAt, subtotal: amount, total: amount, createdAt: boughtAt } });
      if (!lastOrderId) lastOrderId = order.id;
    }
    await prisma.loyaltyAccount.create({ data: { storeId: s1.id, userId: sample.user.id, points: sample.points, lifetimePoints: sample.lifetime, tier: sample.tier } });
    await prisma.loyaltyTransaction.createMany({ data: [
      { storeId: s1.id, userId: sample.user.id, orderId: lastOrderId, type: 'EARN_ORDER', points: sample.lifetime, balance: sample.lifetime, note: `Tích điểm từ ${sample.orders} đơn hàng mẫu`, createdAt },
      ...(sample.lifetime > sample.points ? [{ storeId: s1.id, userId: sample.user.id, orderId: lastOrderId, type: 'REDEEM_POS', points: sample.points - sample.lifetime, balance: sample.points, note: 'Dùng điểm tại quầy', createdAt: new Date(createdAt.getTime() + 3600000) }] : []),
    ] });
  }
  const vipCoupon = await prisma.coupon.create({ data: { storeId: s1.id, code: 'VIP50K', description: 'Voucher riêng giảm 50.000đ cho khách VIP', type: 'FIXED', value: 50000, minOrderValue: 300000, audienceAll: false } });
  await prisma.couponRecipient.createMany({ data: customerSamples.filter((x) => ['GOLD', 'DIAMOND'].includes(x.tier)).map((x) => ({ couponId: vipCoupon.id, userId: x.user.id })) });
  // Cửa hàng 3: Bà Bảy – nhiều mặt hàng tươi sống, ảnh thật, phí ship khác
  await seedBaBay(basic.id, superAdmin.id);

  console.log('✅ Seed xong. Mật khẩu tất cả tài khoản: 123456');
  console.log('   Super admin: super@grocery.local');
  console.log('   Tạp Hoá Xanh (/s/tap-hoa-xanh): admin@grocery.local, staff@grocery.local');
  console.log('   Tạp Hoá Bà Năm (/s/tap-hoa-ba-nam): owner2@grocery.local');
  console.log('   Tạp Hoá Bà Bảy (/s/tap-hoa-ba-bay): owner3@grocery.local, staff3@grocery.local');
  console.log('   Khách hàng: customer@grocery.local');
  console.log('   Tài xế: shipper@grocery.local (vào /shipper)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
