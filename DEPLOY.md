# 🚀 Triển khai CI/CD lên Vercel

Sau khi cài đặt **một lần**, mọi thứ diễn ra tự động bằng GitHub Actions:

| Sự kiện | Việc được làm tự động |
|---|---|
| Mở / cập nhật Pull Request | Test → deploy **Web preview** (gọi API production) → comment link vào PR |
| Merge / push lên `main` | Test → `prisma migrate deploy` lên **DB production** → seed nếu DB trống → deploy **API + Web production** → smoke test |

```
                    GitHub Actions (.github/workflows/ci-cd.yml)
   push main ──► test ──► migrate DB ──► vercel build/deploy API ──► vercel build/deploy Web
                  │         (MySQL)         grocery-store-api           grocery-store-web
                  │                         NestJS (Serverless)         Next.js
                  └── MySQL trong CI: kiểm tra migration, build, smoke test đặt hàng

   Trình duyệt ──► grocery-store-web.vercel.app ──fetch──► grocery-store-api.vercel.app/api ──► MySQL
                                                                    └──► Vercel Blob (ảnh upload)
```

## 1. Chuẩn bị (một lần, khoảng 10 phút)

### 1.1 Tài khoản & token
1. Tài khoản [Vercel](https://vercel.com) (gói Hobby miễn phí là đủ).
2. Tạo **Vercel Token** tại https://vercel.com/account/tokens.
3. Cài các công cụ: `npm i -g vercel`, [GitHub CLI](https://cli.github.com) (`gh auth login`), `jq`, `openssl`.

### 1.2 Tạo project & cấu hình tự động
```bash
export VERCEL_TOKEN=xxxxxxxx
# export VERCEL_SCOPE=ten-team    # nếu deploy vào Team thay vì tài khoản cá nhân
./scripts/vercel-setup.sh
```
Script sẽ:
- Tạo 2 project `grocery-store-api` (thư mục `backend`) và `grocery-store-web` (thư mục `frontend`).
- Đặt Node 22, **tắt Deployment Protection cho API** để trình duyệt gọi được API ở cả preview.
- Tạo `JWT_SECRET` ngẫu nhiên, `CORS_ORIGIN` (domain web + mọi URL preview `grocery-store-web-*.vercel.app`), `NEXT_PUBLIC_API_URL`.
- Sinh **tài khoản admin production** với mật khẩu ngẫu nhiên và in ra màn hình. **Hãy lưu lại.**
- Ghi GitHub Secrets/Variables cho repo.

### 1.3 Database MySQL online
Vercel không chạy được MySQL ở máy bạn, nên production cần một MySQL online, ví dụ **TiDB Cloud Serverless** (miễn phí, tương thích MySQL), **Aiven for MySQL** hoặc **Railway**.
1. Tạo database và copy chuỗi kết nối dạng `mysql://USER:PASS@HOST:PORT/grocery`. TiDB/Aiven cần thêm `?sslaccept=strict`.
2. Chạy lại script để ghi biến `DATABASE_URL` cho project API:
```bash
DATABASE_URL="mysql://USER:PASS@HOST:PORT/grocery?sslaccept=strict" ./scripts/vercel-setup.sh
```
3. (Nên làm) Vercel → project **grocery-store-api** → **Storage** → **Create** → **Blob** → Connect.
   Vercel tự thêm `BLOB_READ_WRITE_TOKEN` để lưu ảnh upload. Serverless không có ổ đĩa lâu dài.

> Mẹo: function serverless mở nhiều kết nối. Nếu nhà cung cấp giới hạn số kết nối, thêm `&connection_limit=1` vào cuối `DATABASE_URL`.

### 1.5 Deploy lần đầu
Push lên `main`, hoặc vào GitHub → **Actions → CI/CD → Run workflow**.
Lần đầu DB còn trống nên sẽ được migrate và seed: 8 danh mục, 10 sản phẩm mẫu, 2 mã giảm giá và tài khoản admin ở bước 1.2.

## 2. GitHub Secrets & Variables

Script đã tạo sẵn. Nếu muốn tự nhập: **Settings → Secrets and variables → Actions**.

| Loại | Tên | Bắt buộc | Mô tả |
|---|---|---|---|
| Secret | `VERCEL_TOKEN` | ✅ | Token Vercel |
| Secret | `VERCEL_ORG_ID` | ✅ | `orgId` trong `.vercel/project.json` |
| Secret | `VERCEL_PROJECT_ID_API` | ✅ | `projectId` của project API |
| Secret | `VERCEL_PROJECT_ID_WEB` | ✅ | `projectId` của project Web |
| Variable | `API_URL` | ✅ | vd `https://grocery-store-api.vercel.app` |
| Variable | `WEB_URL` | | vd `https://grocery-store-web.vercel.app` |
| Secret | `DATABASE_URL` | | Chỉ cần nếu biến trên Vercel đặt kiểu *Sensitive* (CI không đọc được) |

Khi chưa có secrets Vercel, workflow vẫn chạy job **test** và bỏ qua deploy, kèm cảnh báo.

## 3. Biến môi trường trên Vercel

**grocery-store-api**

| Biến | Nguồn |
|---|---|
| `DATABASE_URL` | MySQL online (mục 1.3) |
| `BLOB_READ_WRITE_TOKEN` | Blob store |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` | setup script |
| `SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD` | setup script, sửa được trên dashboard |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | setup script, chỉ dùng khi seed DB trống – tạo tài khoản **Super Admin** của nền tảng (production không tạo dữ liệu demo) |

**grocery-store-web**: `NEXT_PUBLIC_ROOT_DOMAIN` (tuỳ chọn – bật subdomain riêng cho đối tác, cần domain wildcard `*.tenmien` trên Vercel + bản ghi DNS wildcard và thêm `https://*.tenmien` vào `CORS_ORIGIN` của API), `NEXT_PUBLIC_API_URL` (workflow luôn ghi đè lúc build cho đúng API production/preview).

Đổi biến xong cần deploy lại (Run workflow) để có hiệu lực.

## 4. Thay đổi database (migration)

> **Nâng cấp lên bản đa cửa hàng**: migration `20261105040000_multi_store` tự chạy khi deploy, giữ nguyên dữ liệu cũ và gom vào cửa hàng `cua-hang-chinh`. Sau đó tạo super admin:
> `cd backend && DATABASE_URL="mysql://…production…" npm run create-super-admin -- ban@email.com MatKhauManh "Tên"`
> rồi đăng nhập `/super` để đổi tên / slug cửa hàng, gán gói và tạo thêm đối tác.

```bash
cd backend
# sửa prisma/schema.prisma rồi:
npx prisma migrate dev --name them-cot-xyz
git add prisma && git commit -m "..." && git push
```
CI sẽ **fail** nếu bạn sửa `schema.prisma` mà quên tạo migration (bước `prisma migrate diff`).
Khi merge vào `main`, migration được áp lên production **trước** khi deploy code mới.

## 5. Cách backend chạy trên Vercel

- `backend/api/index.js` là Vercel Function (Node 22). Nó khởi tạo Nest app một lần (`src/bootstrap.ts`) rồi tái sử dụng giữa các request.
- `backend/vercel.json` rewrite `/api/*` về function đó. `git.deploymentEnabled: false` tắt auto-deploy của Vercel để chỉ GitHub Actions deploy, tránh deploy 2 lần.
- `schema.prisma` có `binaryTargets = ["native", "rhel-openssl-3.0.x"]` vì build trên runner Ubuntu nhưng chạy trên Amazon Linux của Vercel.
- Seed chỉ chạy khi DB trống, nên deploy nhiều lần không mất dữ liệu.

## 6. Giới hạn & xử lý sự cố

| Vấn đề | Cách xử lý |
|---|---|
| Upload ảnh lỗi 500 trên Vercel | Chưa gắn **Blob** (mục 1.3.3) |
| Ảnh > 4MB bị từ chối | Giới hạn body 4.5MB của Vercel Functions |
| Frontend báo lỗi CORS | Kiểm tra `CORS_ORIGIN` của API có domain web (chạy lại setup script nếu đổi tên domain) |
| Preview API trả trang đăng nhập Vercel | Tắt *Deployment Protection* của project API (script đã làm, kiểm tra Settings → Deployment Protection) |
| `Thiếu GitHub variable API_URL` | Chạy setup script hoặc tạo variable thủ công |
| Request đầu chậm 1–3 giây | Cold start của serverless, bình thường |
| Quên mật khẩu admin production | Đăng ký tài khoản mới, rồi sửa `role` thành `ADMIN` trực tiếp trong MySQL (bảng `User`) |
