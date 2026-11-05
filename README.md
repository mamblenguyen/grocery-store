# 🛒 Chợ Tạp Hoá – Nền tảng bán hàng cho nhiều cửa hàng tạp hoá

> **Đa cửa hàng (multi-tenant):** bạn là **Super Admin** của nền tảng, quản lý nhiều **đối tác**. Mỗi đối tác có cửa hàng riêng (`/s/<slug>`), tài khoản/mật khẩu riêng, dữ liệu (sản phẩm, kho, đơn, khách, cài đặt, thanh toán) **tách biệt hoàn toàn**, có **gói dịch vụ & hạn dùng**.

Dự án full-stack: **NestJS + Prisma + MySQL** (backend), **Next.js 15 + Tailwind CSS 4** (web khách hàng + quản trị) và **app điện thoại Expo / React Native** dùng chung cho khách hàng & nhân viên. Sản phẩm hỗ trợ **nhiều biến thể** (vd: Khối lượng × Hương vị), mỗi biến thể có SKU, giá và tồn kho riêng.

```
grocery-store/
├── backend/            # NestJS REST API (cổng 4000, prefix /api)
│   ├── prisma/         # schema.prisma, migrations, seed.ts
│   └── src/
│       ├── auth/       # Đăng ký, đăng nhập JWT, hồ sơ, đổi mật khẩu
│       ├── super/      # (Super Admin) đối tác, gói dịch vụ, gia hạn, phiếu thu, người dùng
│       ├── stores/     # Danh bạ cửa hàng công khai, bảng giá gói
│       ├── common/     # tenant.ts + tenant.middleware.ts (xác định cửa hàng), auth.guard, plan-limits
│       ├── users/      # Nhân viên, khách hàng, gói dịch vụ của từng cửa hàng
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
├── mobile/             # App điện thoại Expo (Android / iOS / web) – xem mobile/README.md
├── frontend/           # Next.js App Router (cổng 3000)
│   └── src/app/
│       ├── (shop)/     # Trang nền tảng: danh bạ cửa hàng, đăng nhập, tài khoản, đơn hàng (dùng chung)
│       ├── s/[store]/  # Website riêng của từng cửa hàng: trang chủ, sản phẩm, giỏ, thanh toán
│       ├── admin/      # Quản trị cửa hàng (POS, kho, nhân viên, gói dịch vụ…)
│       ├── super/      # Quản trị nền tảng (Super Admin)
│       └── print/      # Trang in hoá đơn A4/K80, phiếu kho, tem QR
├── docker-compose.yml  # MySQL 8 (tuỳ chọn, nếu máy chưa có MySQL)
├── .github/workflows/  # CI/CD: test, deploy production & preview lên Vercel
├── scripts/            # dev.mjs (chạy local 1 lệnh), vercel-setup.sh, smoke-test.sh
├── package.json        # npm run dev
└── DEPLOY.md           # Hướng dẫn triển khai
```

## 🛵 Giao hàng bằng tài xế của sàn (như Grab)

**Luồng:** khách đặt đơn (có thể **ghim vị trí** bằng GPS / chạm bản đồ) → cửa hàng **xác nhận** → hệ thống tự **tìm tài xế** (báo cho tài xế đang trực tuyến) → tài xế **nhận đơn** (ai nhanh người đó được, tối đa 3 đơn cùng lúc) → đến cửa hàng **lấy hàng** (đơn tự chuyển "Đang giao") → **giao & thu COD** (đơn tự "Hoàn thành" + "Đã thanh toán") hoặc báo **giao không thành công** kèm lý do.

| Ai | Ở đâu | Làm gì |
|---|---|---|
| **Tài xế** (`shipper@grocery.local`) | web `/shipper` (tối ưu điện thoại) · app tab **Nhận đơn** | Bật/tắt nhận đơn, xem đơn gần nhất (khoảng cách tới cửa hàng, thời gian ước tính, thu nhập, tiền thu hộ), nhận đơn, **chỉ đường Google Maps**, gọi cửa hàng/khách, xác nhận lấy hàng / giao, trả đơn, lịch sử & thu nhập hôm nay. Vị trí GPS được gửi tự động mỗi 15 giây khi đang trực tuyến / đang giao |
| **Khách** | Trang đơn hàng (web + app) | Thấy tài xế (tên, biển số, nút gọi), tiến trình 4 bước, **bản đồ vị trí tài xế trực tiếp** (tự làm mới 10 giây) |
| **Cửa hàng** | `/admin/orders/<id>` · Cài đặt → **Vị trí cửa hàng** | Theo dõi chuyến, gọi lại / huỷ gọi tài xế; ghim vị trí cửa hàng (điểm lấy hàng) |
| **Super Admin** | `/super/shippers` | Thêm tài xế (phương tiện, biển số, CCCD, khu vực), khoá / mở, đặt lại mật khẩu, thống kê chuyến & thu nhập, giám sát mọi chuyến giao |

- Thu nhập tài xế = phí ship của đơn (tối thiểu `SHIPPER_MIN_FEE`, mặc định 15.000₫ – sàn bù khi cửa hàng miễn phí ship). `SHIPPER_MAX_ACTIVE` (mặc định 3) = số đơn tối đa một tài xế giao cùng lúc.
- Bảo mật: tài xế chỉ thấy SĐT/tên đầy đủ của khách **sau khi nhận đơn**; khách chỉ thấy tài xế của đơn mình.
- Bản đồ: OpenStreetMap + Leaflet (miễn phí, không cần API key). Production nhiều lượt truy cập nên dùng nhà cung cấp tile riêng (MapTiler, Mapbox…) theo chính sách của OSM.

## 🌐 Super Admin quản lý dữ liệu mọi đối tác

Super Admin vào `/admin` (hoặc menu **Đơn hàng & sản phẩm (tất cả)** ở `/super`) → bộ lọc **Đối tác** trên header:
- **🌐 Tất cả đối tác**: tổng quan, đơn hàng (xem, đổi trạng thái, xác nhận thanh toán, in hoá đơn), sản phẩm (bật/tắt, xoá), tồn kho, phiếu kho, khách hàng, báo cáo lợi nhuận, đánh giá của toàn sàn – mỗi dòng có nhãn cửa hàng.
- Chọn **một đối tác** để bán hàng (POS), tạo/sửa sản phẩm, danh mục, mã giảm giá, nhập kho, nhân viên, cài đặt… (bấm "Sửa" một sản phẩm ở chế độ tất cả sẽ tự chuyển sang đúng đối tác).

## 🛍 Sàn thương mại điện tử + subdomain riêng cho đối tác

- **Trang chủ sàn** (`/`): hàng hoá của **tất cả đối tác** – danh mục gộp, giá sốc, bán chạy, hàng mới, gợi ý; tìm & lọc trên toàn sàn (`/products`) để so giá giữa các cửa hàng. Mỗi sản phẩm ghi rõ cửa hàng bán.
- **Giỏ hàng chung** (`/cart`): thêm hàng từ nhiều cửa hàng, giỏ tự chia nhóm theo cửa hàng; mỗi nhóm thanh toán & giao riêng (theo phí ship, tài khoản ngân hàng, mã giảm giá của từng cửa hàng).
- **Danh bạ cửa hàng**: `/stores`.
- **Subdomain riêng**: đặt `NEXT_PUBLIC_ROOT_DOMAIN=tensan.vn` (frontend) → đối tác `tap-hoa-xanh` có website `https://tap-hoa-xanh.tensan.vn` (vẫn dùng được `/s/tap-hoa-xanh`). Trên subdomain, các trang đăng nhập / tài khoản / đơn hàng tự chuyển về tên miền sàn; **đăng nhập 1 lần dùng chung** cho sàn và mọi subdomain (cookie trên tên miền gốc), đăng xuất cũng đồng bộ.
  - DNS: tạo bản ghi wildcard `*.tensan.vn` (CNAME/A) trỏ về nơi chạy web; trên Vercel thêm domain `tensan.vn` và `*.tensan.vn` vào project web.
  - Backend: thêm vào `CORS_ORIGIN` cả `https://tensan.vn,https://*.tensan.vn`.
  - Thử ở máy: `NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000` (mọi `*.lvh.me` trỏ về 127.0.0.1) rồi mở http://lvh.me:3000 và http://tap-hoa-xanh.lvh.me:3000; nhớ thêm `http://lvh.me:3000,http://*.lvh.me:3000` vào `CORS_ORIGIN` của backend.
  - Giỏ hàng lưu theo trình duyệt & tên miền: hàng thêm trên subdomain nằm ở giỏ của subdomain đó.
- App: trang chủ là sàn (hàng của mọi cửa hàng), giỏ hàng chung chia theo cửa hàng, quét QR (kể cả link subdomain) để vào cửa hàng.
- Ảnh minh hoạ sản phẩm mẫu (`frontend/public/products`) dùng đồ hoạ Twemoji © Twitter/X – CC-BY 4.0; ảnh thật do cửa hàng tự tải lên. DB cũ dùng ảnh ngẫu nhiên sẽ tự được thay khi chạy `npm run dev`.

## 🏢 Nền tảng đa cửa hàng

| Vai trò | Vào đâu | Làm được gì |
|---|---|---|
| **Super Admin** (bạn) | `/super` (web) · tab **Nền tảng** (app) | Tổng quan (số cửa hàng, MRR, GMV, sắp hết hạn), **tạo đối tác** kèm **thông tin đối tác** (loại hình, tên DN/HKD, MST, người đại diện, CCCD, tài khoản đối soát, số & ngày hợp đồng – chỉ super admin xem), cửa hàng + subdomain + tài khoản chủ, đổi gói, **gia hạn** (tự ghi phiếu thu), tạm ngưng / mở lại / đóng, đặt lại mật khẩu, quản lý gói dịch vụ, phiếu thu, toàn bộ người dùng, **"Quản trị hộ"** bất kỳ cửa hàng nào |
| **Chủ cửa hàng** (ADMIN) | `/admin` | Toàn quyền cửa hàng của mình + thêm **nhân viên**, cài đặt, xem **gói dịch vụ** (mức dùng, hạn, lịch sử thanh toán, **mã QR cửa hàng** để in dán quầy) |
| **Nhân viên** (STAFF) | `/admin` · tab **Quản lý** | POS, kho, đơn hàng, báo cáo của cửa hàng mình |
| **Khách hàng** | `/` → chọn cửa hàng → `/s/<slug>` | 1 tài khoản dùng chung mọi cửa hàng; giỏ hàng riêng từng cửa hàng; đơn hàng tổng hợp có tên cửa hàng |

- **Cách ly dữ liệu** ở backend: storefront gửi header `X-Store: <slug>`; nhân viên luôn bị khoá vào cửa hàng của tài khoản (bỏ qua mọi header); super admin quản trị hộ qua `X-Store-Id`. Truy cập chéo cửa hàng → 404/403 (có bộ test tự động).
- **Gói & hạn dùng**: gói giới hạn số sản phẩm / nhân viên. **Hết hạn** → cửa hàng chỉ *xem* dữ liệu (ghi → 402), storefront tạm ngưng nhận đơn online; **tạm ngưng** → khách & nhân viên không truy cập được; còn ≤ 7 ngày → hiện cảnh báo.
- SKU, mã giảm giá, slug sản phẩm/danh mục chỉ cần **duy nhất trong 1 cửa hàng**.
- Nâng cấp từ bản 1 cửa hàng: migration `20261105040000_multi_store` **giữ nguyên dữ liệu cũ**, gom vào cửa hàng `cua-hang-chinh` (gói "unlimited"); tạo tài khoản super admin bằng lệnh bên dưới.

```bash
cd backend
npm run create-super-admin -- ban@email.com MatKhauManh "Tên của bạn"
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

### 🆕 Bổ sung
- **Bán tại quầy – quét liên tục**: camera quét luôn bật ngay trên màn POS, **máy quét USB/Bluetooth nhận ở mọi nơi trên trang** (không cần focus ô nhập), tiếng bíp / âm báo lỗi, nhân số lượng `3*` rồi quét, **nhiều hoá đơn chờ** (lưu khi tải lại trang), phím tắt F2 / F4 / F8 / F9
- **Báo cáo lợi nhuận**: doanh thu, giá vốn (snapshot giá vốn tại thời điểm bán), lợi nhuận gộp, biên LN theo ngày/tháng, danh mục, phương thức thanh toán, kênh bán, top sản phẩm
- **Lô sắp hết hạn** (theo số lô & HSD trên phiếu nhập)
- **Thông báo** trong web/app (chuông) + **push notification** cho app: đơn mới (nhân viên), đổi trạng thái / đã thanh toán (khách)
- **Quên / đặt lại mật khẩu** qua email (SMTP; chưa cấu hình thì link in ra log API)
- **Bảo mật**: giới hạn tần suất (đăng nhập 10 lần/phút), Helmet; **tài liệu API Swagger** tại `http://localhost:4000/api/docs`
- Giao diện kiểm tra tự động ở 360 / 768 / 1024 / 1440px – không tràn ngang

### 📱 App điện thoại (`mobile/`)
Một app cho cả khách và nhân viên (tab **Quản lý** chỉ hiện với ADMIN/STAFF): mua sắm, thanh toán COD/VietQR/VNPay, đơn hàng, đánh giá, yêu thích, thông báo; POS quét camera liên tục, tra cứu mã, phiếu nhập/xuất/kiểm kê bằng quét, quản lý đơn, báo cáo, in hoá đơn. Chạy: `npm run mobile` (chi tiết trong `mobile/README.md`).

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

App điện thoại: `npm run mobile` (Expo) hoặc `npm run mobile:web` (chạy trên trình duyệt) – lần đầu cần `cd mobile && npm install`.

Các lệnh khác ở thư mục gốc: `npm run db:reset` (xoá DB & seed lại), `npm run db:studio` (xem dữ liệu bằng Prisma Studio), `npm run build`.

### Tài khoản demo (mật khẩu `123456`)
| Vai trò | Email | Vào |
|---|---|---|
| **Super Admin** (nền tảng) | super@grocery.local | http://localhost:3000/super |
| Chủ cửa hàng *Tạp Hoá Xanh* (gói Chuyên nghiệp, 12 tháng) | admin@grocery.local | /admin |
| Nhân viên *Tạp Hoá Xanh* | staff@grocery.local | /admin |
| Chủ cửa hàng *Tạp Hoá Bà Năm* (gói Cơ bản, 1 tháng) | owner2@grocery.local | /admin |
| Khách hàng | customer@grocery.local | / (trang sàn) |
| **Tài xế giao hàng** | shipper@grocery.local | /shipper · app tab "Nhận đơn" |

Cửa hàng mẫu: http://localhost:3000/s/tap-hoa-xanh và http://localhost:3000/s/tap-hoa-ba-nam.
Mã giảm giá mẫu: Tạp Hoá Xanh `WELCOME10` (giảm 10%, tối đa 50k, đơn từ 100k), `GIAM20K` (giảm 20k, đơn từ 200k); Bà Năm `BANAM5K`.

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

**backend/.env**: `SHIPPER_MIN_FEE`, `SHIPPER_MAX_ACTIVE` (giao hàng), `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `BLOB_READ_WRITE_TOKEN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`
**frontend/.env.local**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` (bật subdomain cho đối tác), `NEXT_PUBLIC_PLATFORM_NAME` (tên nền tảng, mặc định "Chợ Tạp Hoá"), `NEXT_PUBLIC_PLATFORM_HOTLINE` (hiện ở trang giới thiệu cho đối tác)
