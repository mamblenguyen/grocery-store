# 🛒 Tạp Hoá Xanh – Hệ thống quản lý & bán hàng tạp hoá

Dự án full-stack: **NestJS + Prisma + MySQL** (backend) và **Next.js 15 + Tailwind CSS 4** (frontend), gồm **trang khách hàng** và **trang quản trị**. Sản phẩm hỗ trợ **nhiều biến thể** (vd: Khối lượng × Hương vị), mỗi biến thể có SKU, giá và tồn kho riêng.

```
grocery-store/
├── backend/            # NestJS REST API (cổng 4000, prefix /api)
│   ├── prisma/         # schema.prisma, migrations, seed.ts
│   └── src/
│       ├── auth/       # Đăng ký, đăng nhập JWT, hồ sơ, đổi mật khẩu
│       ├── users/      # (Admin) quản lý người dùng, phân quyền, khoá tài khoản
│       ├── categories/ # Danh mục (hỗ trợ danh mục cha/con)
│       ├── products/   # Sản phẩm + thuộc tính + biến thể
│       ├── orders/     # Đặt hàng, luồng trạng thái, huỷ đơn & hoàn kho
│       ├── coupons/    # Mã giảm giá (% / số tiền, giới hạn lượt, thời gian)
│       ├── inventory/  # Tồn kho, nhập/xuất/điều chỉnh, lịch sử kho
│       ├── dashboard/  # Thống kê doanh thu, top bán chạy, sắp hết hàng
│       └── upload/     # Upload ảnh (Vercel Blob hoặc backend/uploads)
├── frontend/           # Next.js App Router (cổng 3000)
│   └── src/app/
│       ├── (shop)/     # Trang khách hàng
│       └── admin/      # Trang quản trị
├── docker-compose.yml  # MySQL 8 (tuỳ chọn, nếu máy chưa có MySQL)
├── .github/workflows/  # CI/CD: test, deploy production & preview lên Vercel
├── scripts/            # dev.mjs (chạy local 1 lệnh), vercel-setup.sh, smoke-test.sh
├── package.json        # npm run dev
└── DEPLOY.md           # Hướng dẫn triển khai
```

## ✨ Tính năng

### Trang khách hàng (`http://localhost:3000`)
- Trang chủ: banner, danh mục, sản phẩm nổi bật / bán chạy / mới về
- Danh sách sản phẩm: tìm kiếm (tên, thương hiệu, SKU, mã vạch), lọc theo danh mục, khoảng giá, thương hiệu, còn hàng; sắp xếp; phân trang
- Chi tiết sản phẩm: **chọn biến thể theo từng thuộc tính**, tự ẩn/đánh dấu tổ hợp hết hàng, giá & tồn kho theo biến thể, % giảm giá, sản phẩm liên quan
- Giỏ hàng (lưu localStorage, đồng bộ giá/tồn kho với server)
- Thanh toán: thông tin giao hàng, COD / chuyển khoản, **áp mã giảm giá**, miễn phí ship theo ngưỡng
- Đăng ký / đăng nhập, cập nhật hồ sơ, đổi mật khẩu
- Đơn hàng của tôi: lọc theo trạng thái, chi tiết + timeline, **huỷ đơn khi đang chờ xác nhận**

### Trang quản trị (`http://localhost:3000/admin`)
- **Tổng quan**: doanh thu, đơn hôm nay, biểu đồ doanh thu 7/14/30 ngày, đơn theo trạng thái, top bán chạy, cảnh báo sắp hết hàng
- **Sản phẩm**: CRUD, upload ảnh, bật/tắt bán, nổi bật; **trình tạo biến thể** – khai báo tối đa 3 thuộc tính, hệ thống tự sinh tổ hợp; sửa SKU/mã vạch/giá bán/giá gốc/giá nhập/tồn kho/ngưỡng cảnh báo từng biến thể; áp giá/tồn hàng loạt
- **Danh mục**: CRUD, danh mục cha/con, thứ tự, ẩn/hiện
- **Đơn hàng**: lọc theo trạng thái/ngày/từ khoá; chuyển trạng thái theo luồng `Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành` hoặc `Huỷ` (tự hoàn kho, hoàn lượt mã giảm giá); cập nhật thanh toán; in đơn
- **Kho hàng**: tồn kho theo biến thể (lọc sắp hết / hết hàng), nhập thêm / xuất hao hụt / đặt số lượng, **lịch sử xuất nhập** (nhập, bán, huỷ đơn, điều chỉnh)
- **Mã giảm giá**: % hoặc cố định, đơn tối thiểu, giảm tối đa, số lượt, thời gian hiệu lực
- **Người dùng** (chỉ ADMIN): tìm kiếm, đổi vai trò (ADMIN / STAFF / CUSTOMER), khoá/mở khoá, xem lịch sử mua & tổng chi tiêu

### Nghiệp vụ được đảm bảo ở backend
- Trừ kho **trong transaction** với điều kiện `stock >= quantity` → không bán vượt tồn khi nhiều người đặt cùng lúc
- Giá đơn hàng luôn tính lại ở server (không tin giá từ client)
- Lưu snapshot tên/giá/SKU vào `OrderItem` → sửa/xoá sản phẩm không ảnh hưởng đơn cũ
- Cập nhật sản phẩm giữ nguyên ID biến thể cũ, mọi thay đổi tồn kho được ghi log
- Phân quyền bằng JWT + role guard; lỗi Prisma được chuyển thành HTTP 404/409/400 dễ hiểu

## 🗃 Mô hình dữ liệu biến thể

```
Product ─┬─ ProductOption (Khối lượng) ── ProductOptionValue (500g, 1kg)
         │                                         │
         └─ ProductVariant (SKU, giá, tồn) ── VariantOptionValue (bảng nối)
```
Ví dụ *Mì Hảo Hảo*: thuộc tính `Hương vị` × `Quy cách` → 6 biến thể, mỗi biến thể có SKU, giá và tồn kho riêng.

## ☁️ Deploy tự động (CI/CD Vercel)

GitHub Actions sẽ test → migrate DB MySQL → deploy API + Web lên Vercel mỗi khi push `main`. Mỗi Pull Request có link preview. Xem hướng dẫn cài đặt một lần trong **[DEPLOY.md](DEPLOY.md)**.

## 🚀 Chạy ở local – chỉ 1 lệnh

Yêu cầu: **Node.js ≥ 20** và **MySQL 8** đang chạy (mặc định `root:root@localhost:3306`, hoặc `npm run db:up` để bật bằng Docker).

```bash
npm run dev
```

Lệnh này tự động:
1. Tạo `backend/.env` và `frontend/.env.local` từ file mẫu (nếu chưa có)
2. Kiểm tra kết nối MySQL và port 3000/4000 còn trống
3. `npm install` cho backend & frontend (lần đầu)
4. Tạo database nếu chưa có → chạy migration → seed dữ liệu mẫu (chỉ khi DB trống)
5. Chạy song song **API** (NestJS, tự reload) và **Web** (Next.js), log có tiền tố `[api]` / `[web]`. Nhấn **Ctrl+C** để dừng cả hai.

| | URL |
|---|---|
| 🛒 Cửa hàng | http://localhost:3000 |
| 🛠 Quản trị | http://localhost:3000/admin |
| 🔌 API | http://localhost:4000/api |

**MySQL ở port / tài khoản khác mặc định** (`root:root@localhost:3306/grocery`):
```bash
npm run dev -- --db-port=3307
npm run dev -- --db-url="mysql://USER:PASS@localhost:3306/grocery"
```
Giá trị được lưu vào `backend/.env`, các lần sau chỉ cần `npm run dev`.

Các lệnh khác ở thư mục gốc: `npm run db:reset` (xoá DB & seed lại), `npm run db:studio` (xem dữ liệu bằng Prisma Studio), `npm run build`.

### Tài khoản demo (mật khẩu `123456`)
| Vai trò | Email |
|---|---|
| Quản trị | admin@grocery.local |
| Nhân viên | staff@grocery.local |
| Khách hàng | customer@grocery.local |

Mã giảm giá mẫu: `WELCOME10` (giảm 10%, tối đa 50k, đơn từ 100k), `GIAM20K` (giảm 20k, đơn từ 200k).

## 📡 API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Đăng ký / đăng nhập |
| GET/PATCH | `/api/auth/me` | Hồ sơ |
| GET | `/api/products?search=&category=&minPrice=&maxPrice=&brand=&sort=&inStock=&page=` | Danh sách sản phẩm |
| GET | `/api/products/:slug` | Chi tiết + biến thể |
| GET | `/api/categories` | Danh mục |
| POST | `/api/orders/preview` | Tính tiền giỏ hàng + mã giảm giá |
| POST | `/api/orders` | Đặt hàng |
| GET | `/api/orders/my`, `/api/orders/my/:id` | Đơn của tôi |
| PATCH | `/api/orders/my/:id/cancel` | Khách huỷ đơn |
| POST | `/api/coupons/validate` | Kiểm tra mã |
| * | `/api/admin/products` (GET, POST, PUT `:id`, DELETE, PATCH `:id/toggle-active`) | Quản lý sản phẩm |
| * | `/api/admin/categories`, `/api/admin/coupons` | Quản lý danh mục, mã giảm giá |
| GET/PATCH | `/api/admin/orders`, `/api/admin/orders/:id/status`, `/:id/payment` | Quản lý đơn |
| GET/POST | `/api/admin/inventory`, `/logs`, `/adjust` | Kho hàng |
| GET | `/api/admin/dashboard?days=7` | Thống kê |
| GET | `/api/health` | Kiểm tra API + kết nối DB |
| GET/PATCH | `/api/admin/users` | Người dùng (ADMIN) |
| POST | `/api/admin/upload` (multipart `files`) | Upload ảnh |

Payload tạo sản phẩm có biến thể:
```json
{
  "name": "Mì Hảo Hảo", "categoryId": 5, "brand": "Acecook",
  "options": [
    { "name": "Hương vị", "values": ["Tôm chua cay", "Gà vàng"] },
    { "name": "Quy cách", "values": ["Gói lẻ", "Thùng 30 gói"] }
  ],
  "variants": [
    { "sku": "HH-TCC-1", "price": 4500, "stock": 200, "optionValues": ["Tôm chua cay", "Gói lẻ"] },
    { "sku": "HH-TCC-30", "price": 118000, "compareAtPrice": 135000, "stock": 20, "optionValues": ["Tôm chua cay", "Thùng 30 gói"] }
  ]
}
```

## ⚙️ Biến môi trường

**backend/.env**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD`, `BLOB_READ_WRITE_TOKEN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
**frontend/.env.local**: `NEXT_PUBLIC_API_URL`
