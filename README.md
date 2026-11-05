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
│       ├── settings/   # Cài đặt cửa hàng
│       ├── payments/   # VNPay, giao dịch thanh toán
│       ├── stock/      # Phiếu nhập/xuất/kiểm kê, nhà cung cấp, tra mã
│       ├── reviews/ wishlist/ addresses/
│       ├── inventory/  # Tồn kho, nhập/xuất/điều chỉnh, lịch sử kho
│       ├── dashboard/  # Thống kê doanh thu, top bán chạy, sắp hết hàng
│       └── upload/     # Upload ảnh (Vercel Blob hoặc backend/uploads)
├── frontend/           # Next.js App Router (cổng 3000)
│   └── src/app/
│       ├── (shop)/     # Trang khách hàng
│       ├── admin/      # Trang quản trị (POS, kho, cài đặt…)
│       └── print/      # Trang in hoá đơn A4/K80, phiếu kho, tem QR
├── docker-compose.yml  # MySQL 8 (tuỳ chọn, nếu máy chưa có MySQL)
├── .github/workflows/  # CI/CD: test, deploy production & preview lên Vercel
├── scripts/            # dev.mjs (chạy local 1 lệnh), vercel-setup.sh, smoke-test.sh
├── package.json        # npm run dev
└── DEPLOY.md           # Hướng dẫn triển khai
```

## ✨ Tính năng

### 🛒 Trang khách hàng (`http://localhost:3000`)
- **Giao diện mới**: header có thanh thông báo, hotline, tìm kiếm gợi ý tức thì, menu danh mục; slider banner; khối "Giá sốc"; footer đầy đủ; **giỏ hàng trượt**; thanh điều hướng dưới cho **mobile**
- Danh sách sản phẩm: lọc theo danh mục / khoảng giá / thương hiệu / còn hàng, sắp xếp, bộ lọc dạng ngăn kéo trên mobile
- Chi tiết sản phẩm: **chọn biến thể theo từng thuộc tính** (tự đánh dấu tổ hợp hết hàng), thư viện ảnh, **đánh giá 1–5 sao** (chỉ người đã mua), sản phẩm liên quan
- **Thanh toán**: chọn từ **sổ địa chỉ**, chọn **ngày & khung giờ giao**, mã giảm giá, miễn phí ship theo ngưỡng, 3 phương thức:
  - COD (trả tiền khi nhận hàng)
  - **Chuyển khoản VietQR**: mã QR tự điền số tiền & nội dung chuyển khoản
  - **VNPay** (thẻ ATM / Visa / QR): ký HMAC-SHA512, xác thực Return URL + IPN, idempotent
- Tài khoản: hồ sơ, đổi mật khẩu, **sổ địa chỉ**, **sản phẩm yêu thích**, đơn hàng (timeline, thanh toán lại VNPay, **mua lại**, **in hoá đơn**, huỷ đơn)

### 🛠 Trang quản trị (`http://localhost:3000/admin`)
- **Tổng quan**: doanh thu, biểu đồ 7/14/30 ngày, trạng thái đơn, bán chạy, cảnh báo sắp hết hàng
- **Bán tại quầy (POS)**: quét mã vạch / QR (máy quét USB hoặc **camera**), lưới chọn nhanh, giảm giá tay / mã giảm giá, tiền mặt (gợi ý mệnh giá, tính tiền thối) hoặc chuyển khoản QR, phím tắt **F9**, in bill K80 ngay
- **Đơn hàng**: lọc theo trạng thái / kênh (Online, Tại quầy) / thanh toán / ngày, luồng trạng thái tự hoàn kho khi huỷ, xác nhận đã nhận tiền, lịch sử giao dịch, **xuất Excel (CSV)**, **in hoá đơn A4 / K80**
- **Sản phẩm & biến thể** (tự sinh tổ hợp thuộc tính, SKU, mã vạch, giá bán / giá gốc / giá vốn), danh mục, mã giảm giá, **kiểm duyệt đánh giá**, người dùng & phân quyền
- **Cài đặt cửa hàng**: tên, logo, liên hệ, thông báo; MST, VAT, lời cảm ơn trên hoá đơn; phí ship, đơn tối thiểu, khung giờ giao; bật/tắt phương thức thanh toán, tài khoản ngân hàng (xem trước QR); banner trang chủ; mạng xã hội

### 📦 Xuất nhập kho
- **Phiếu nhập kho** (PN): nhà cung cấp, số HĐ, giá nhập, số lô, hạn dùng → tự tính **giá vốn bình quân gia quyền**
- **Phiếu xuất kho** (PX): hư hỏng / hết hạn / trả NCC / nội bộ – chặn xuất vượt tồn, ghi nhận giá vốn tại thời điểm xuất
- **Phiếu kiểm kê** (KK): chụp tồn hệ thống lúc hoàn tất, ghi chênh lệch số lượng & giá trị
- Quy trình **Nháp → Hoàn tất → Huỷ**; huỷ phiếu đã hoàn tất sẽ **đảo ngược chính xác** tồn kho & giá vốn; mọi thao tác chạy trong transaction
- Thêm hàng bằng **quét QR / mã vạch** (camera điện thoại / webcam hoặc máy quét USB), quét lại cùng mã tự cộng dồn
- **Tồn kho**: giá trị tồn theo giá vốn & giá bán, biên lợi nhuận, sắp hết / hết hàng, điều chỉnh nhanh có lý do
- **Lịch sử xuất nhập** đầy đủ (nhập, xuất, kiểm kê, bán hàng, huỷ đơn, điều chỉnh) có liên kết chứng từ
- **Nhà cung cấp**; **in tem QR** (40×30, 50×40 hoặc lưới A4) để dán kệ / sản phẩm
- **In phiếu kho** theo mẫu 01-VT / 02-VT / 05-VT kèm 4 chữ ký

### 🧾 Hoá đơn
- **A4**: thông tin cửa hàng + MST, số hoá đơn, khách hàng, bảng hàng hoá, chiết khấu, phí ship, **tách thuế GTGT** (giá đã gồm VAT), **số tiền bằng chữ**, QR tra cứu, QR chuyển khoản nếu chưa thanh toán, chữ ký người mua / người bán
- **K80** cho máy in nhiệt: dùng tại quầy, có tiền khách đưa / tiền thối
- Lưu ý: đây là hoá đơn bán lẻ nội bộ. Hoá đơn GTGT điện tử theo NĐ 123/2020 cần phát hành qua nhà cung cấp HĐĐT.

### Nghiệp vụ được đảm bảo ở backend
- Trừ kho **trong transaction** với điều kiện `stock >= quantity` → không bán vượt tồn khi đặt đồng thời
- Giá đơn hàng, phí ship, mã giảm giá luôn tính lại ở server; khung giờ / phương thức thanh toán được kiểm tra theo cài đặt
- Lưu snapshot tên/giá/SKU vào `OrderItem`; mọi biến động tồn kho được ghi log kèm giá vốn
- Phân quyền JWT: ADMIN / STAFF (bán hàng, kho) / CUSTOMER

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
| GET / PUT | `/api/settings`, `/api/admin/settings` | Cài đặt cửa hàng (public / admin) |
| POST | `/api/payments/vnpay/create` · GET `/vnpay/return` · GET `/vnpay/ipn` | Thanh toán VNPay |
| POST | `/api/admin/orders/pos` · GET `/api/admin/orders/export` | Bán tại quầy, xuất CSV |
| GET / POST / PUT | `/api/admin/stock/documents` (+ `/:id/complete`, `/:id/cancel`) | Phiếu nhập / xuất / kiểm kê |
| GET | `/api/admin/stock/lookup?code=` | Tra mã vạch / SKU / QR |
| * | `/api/admin/suppliers`, `/api/addresses`, `/api/wishlist`, `/api/products/:id/reviews`, `/api/admin/reviews` | NCC, địa chỉ, yêu thích, đánh giá |
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

## 💳 Cấu hình VNPay (tuỳ chọn)
1. Đăng ký tài khoản sandbox miễn phí: https://sandbox.vnpayment.vn/devreg/
2. Thêm vào `backend/.env`: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` (và `VNPAY_RETURN_URL` nếu frontend không chạy ở localhost:3000)
3. Trên môi trường thật, khai báo IPN URL `https://<api-domain>/api/payments/vnpay/ipn` với VNPay
Khi chưa cấu hình, VNPay tự ẩn khỏi trang thanh toán.

## 📷 Quét mã bằng camera
Trình duyệt chỉ cho mở camera trên **HTTPS** hoặc **http://localhost**. Để dùng điện thoại quét khi chạy ở máy tính, truy cập qua HTTPS (vd `ngrok http 3000`) hoặc dùng máy quét mã vạch USB (hoạt động như bàn phím, không cần cấu hình).

## ⚙️ Biến môi trường

**backend/.env**: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `BLOB_READ_WRITE_TOKEN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`
**frontend/.env.local**: `NEXT_PUBLIC_API_URL`
