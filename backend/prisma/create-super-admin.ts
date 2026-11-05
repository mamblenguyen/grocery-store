/**
 * Tạo (hoặc nâng quyền) tài khoản SUPER ADMIN cho DB đã có dữ liệu.
 *   npm run create-super-admin -- email@domain.com MatKhauManh
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const [email, password, ...name] = process.argv.slice(2);
  if (!email || !password || password.length < 6) {
    console.error('Cách dùng: npm run create-super-admin -- <email> <mật khẩu ≥ 6 ký tự> [họ tên]');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const u = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), password: hash, fullName: name.join(' ') || 'Quản trị nền tảng', role: 'SUPER_ADMIN' },
    update: { password: hash, role: 'SUPER_ADMIN', storeId: null, isActive: true },
  });
  console.log(`✅ Super admin: ${u.email} – đăng nhập rồi vào /super`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
