# 📱 App Tạp Hoá Xanh (Expo / React Native)

**Một app duy nhất** cho cả khách hàng và nhân viên: khách thấy các tab mua sắm; khi tài khoản **Quản trị / Nhân viên** đăng nhập, app hiện thêm tab **Quản lý** (POS quét mã, kho, đơn hàng, báo cáo). Dùng chung API với web (`backend/`).

Chạy được trên **Android, iOS** và **trình duyệt** (cùng một mã nguồn). Giao diện tự co giãn từ điện thoại nhỏ đến tablet.

## Tính năng

**Khách hàng**
- Trang chủ: banner, danh mục, giá sốc, nổi bật, bán chạy, hàng mới (kéo để làm mới)
- Tìm kiếm, lọc danh mục, sắp xếp, cuộn vô hạn; **quét mã vạch trên bao bì** để tìm sản phẩm
- Chi tiết sản phẩm: ảnh trượt, chọn biến thể theo thuộc tính (tự đánh dấu hết hàng), đánh giá & viết đánh giá, sản phẩm liên quan
- Giỏ hàng (lưu trên máy), thanh tiến độ miễn phí ship
- Thanh toán: sổ địa chỉ, ngày & khung giờ giao, mã giảm giá, **COD / VietQR / VNPay**
- Đơn hàng: tiến trình, **QR chuyển khoản** (chạm để sao chép STK / nội dung), thanh toán lại VNPay, huỷ đơn, **mua lại**, **in hoá đơn** (AirPrint / Android Print)
- Tài khoản: hồ sơ, đổi mật khẩu, quên mật khẩu, sổ địa chỉ, yêu thích, **thông báo** + **push notification**

**Nhân viên / Quản lý** (tab *Quản lý*)
- Tổng quan hôm nay, cảnh báo đơn chờ & hàng sắp hết
- **Bán tại quầy (POS)**: camera **quét liên tục** (bíp + rung), SL mỗi lần quét ×1/×2/×3/×5/×10, tìm theo tên/SKU, tiền mặt (gợi ý mệnh giá, tiền thối) / chuyển khoản QR, **in bill K80**, hoá đơn đang bán được lưu khi tắt app
- **Tra cứu mã**: quét → giá bán, giá vốn, biên lợi nhuận, tồn kho; điều chỉnh tồn nhanh
- **Phiếu nhập / xuất / kiểm kê** bằng quét liên tục (quét lại cùng mã = +1), giá nhập, số lô, HSD; lưu nháp / hoàn tất / huỷ (đảo ngược tồn)
- **Đơn hàng**: lọc, tìm, chuyển trạng thái, xác nhận đã nhận tiền, gọi khách, in K80/A4
- **Báo cáo lợi nhuận**: doanh thu, giá vốn, lợi nhuận, biên LN, top sản phẩm, theo danh mục

## Chạy thử

```bash
cd mobile
npm install
cp .env.example .env      # sửa EXPO_PUBLIC_API_URL cho đúng (xem bên dưới)
npx expo start
```
Sau đó: quét QR bằng app **Expo Go** (Android/iOS), hoặc nhấn `a` (máy ảo Android), `i` (máy ảo iOS), `w` (trình duyệt).

**Địa chỉ API (`EXPO_PUBLIC_API_URL`)** – backend phải đang chạy (`npm run dev` ở thư mục gốc):
| Thiết bị | Giá trị |
|---|---|
| Trình duyệt / máy ảo iOS | `http://localhost:4000/api` |
| Máy ảo Android | `http://10.0.2.2:4000/api` |
| Điện thoại thật (cùng Wi-Fi với máy tính) | `http://<IP-máy-tính>:4000/api` (vd `http://192.168.1.10:4000/api`) |

Khi chạy bản web của app (cổng 8081), thêm `http://localhost:8081` vào `CORS_ORIGIN` trong `backend/.env` (đã có sẵn trong `.env.example`).

## Push notification
- **Expo Go**: thông báo trong app (tab Tài khoản → Thông báo) hoạt động đầy đủ; push đẩy ra màn hình khoá cần **development build** (Expo Go trên Android không hỗ trợ push từ SDK 53).
- Để bật push thật:
  1. `npx eas-cli@latest init` → điền `projectId` vào `app.json` → `expo.extra.eas.projectId`
  2. Build: `npx eas-cli@latest build --profile development --platform android` (hoặc `ios`)
  3. Cài bản build, đăng nhập → app tự đăng ký push token với server. Server gửi push khi: có đơn mới (nhân viên), đơn đổi trạng thái / đã thanh toán (khách).

## Quét mã vạch
- Điện thoại: dùng bộ quét native của `expo-camera` (QR, EAN-13/8, UPC, Code 128/39).
- Bản web: dùng `BarcodeDetector` của trình duyệt hoặc thư viện zxing-wasm; file `zxing_reader.wasm` được tự chép vào `public/` khi `npm install` để không phụ thuộc CDN. Camera trên web cần **HTTPS** hoặc `localhost`.

## Build phát hành
```bash
npx eas-cli@latest build --platform android   # file .aab/.apk
npx eas-cli@latest build --platform ios
npm run export:web                              # bản web tĩnh trong dist/
```

## Cấu trúc
```
src/
├── app/                 # Màn hình (Expo Router)
│   ├── (tabs)/          # Trang chủ, Danh mục, Giỏ hàng, Tài khoản, Quản lý (chỉ nhân viên)
│   ├── products/        # Danh sách, chi tiết
│   ├── orders/          # Đơn hàng của tôi
│   ├── account/         # Hồ sơ, mật khẩu, địa chỉ, yêu thích, thông báo
│   ├── staff/           # POS, tra cứu, phiếu kho, đơn hàng, báo cáo
│   └── checkout, login, register, forgot-password
├── components/          # UI kit, ProductCard, Scanner, StaffSearch…
├── context/             # auth, cart, settings, wishlist, notifications
└── lib/                 # api, theme, format, invoice (in), feedback (bíp/rung)…
```
