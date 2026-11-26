# Hoá đơn điện tử, thuế GTGT & quy trình đăng ký đối tác

> Tài liệu nghiên cứu để đối chiếu khi vận hành sàn. Cập nhật: **08/11/2026**.
> Đây là tổng hợp kỹ thuật, **không thay thế tư vấn pháp lý/thuế**. Các mục đánh dấu ⚠ cần đối chiếu văn bản gốc
> (vbpl.vn, thuvienphapluat.vn, Cổng TTĐT Chính phủ) hoặc hỏi cơ quan thuế quản lý trước khi áp dụng chính thức.

## 1. Căn cứ pháp lý chính

| Lĩnh vực | Văn bản | Điểm dùng trong dự án |
|---|---|---|
| Hoá đơn | NĐ 123/2020/NĐ-CP, sửa đổi bởi **NĐ 70/2025/NĐ-CP** (hiệu lực 01/06/2025); **TT 32/2025/TT-BTC** (thay TT 78/2021) | Nội dung hoá đơn, ký hiệu, thời điểm lập, HĐĐT khởi tạo từ máy tính tiền, xử lý sai sót |
| Thuế GTGT | Luật Thuế GTGT 48/2024/QH15, sửa đổi bởi Luật 149/2025/QH15 | Thuế suất 0/5/10%, đối tượng không chịu thuế |
| Giảm thuế | NQ 204/2025/QH15 + **NĐ 174/2025/NĐ-CP** | 10% → **8% đến hết 31/12/2026** (trừ Phụ lục I, II; từ 01/01/2026 nước giải khát có đường > 5g/100ml không được giảm) |
| Thuế HKD | NQ 198/2025/QH15 (bỏ thuế khoán từ 01/01/2026), **NĐ 68/2026/NĐ-CP**, sửa đổi bởi **NĐ 141/2026/NĐ-CP** ⚠ | Ngưỡng không chịu thuế, tỷ lệ % trên doanh thu, kê khai |
| Quản lý thuế TMĐT | NĐ 117/2025/NĐ-CP (01/07/2025); từ 01/07/2026 hướng dẫn tại **NĐ 252/2026/NĐ-CP** ⚠ | Sàn có chức năng đặt hàng + thanh toán phải khấu trừ, khai thay, nộp thay thuế cho HKD/cá nhân |
| TMĐT | **Luật TMĐT 122/2025/QH15** + **NĐ 248/2026/NĐ-CP** (hiệu lực 01/07/2026) | Bắt buộc xác thực điện tử danh tính người bán trước khi mở gian hàng; gỡ thông tin vi phạm |
| Hợp đồng điện tử | Luật Giao dịch điện tử 20/2023/QH15; BLDS 2015; Luật Thương mại 2005 | Giao kết hợp đồng bằng thông điệp dữ liệu, chữ ký điện tử |
| Dữ liệu cá nhân | Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (01/01/2026); NĐ 13/2023 | Đồng ý xử lý dữ liệu CCCD/giấy tờ; tối thiểu hoá; bảo mật |
| Người tiêu dùng | Luật Bảo vệ quyền lợi NTD 19/2023/QH15 | Thông tin hàng hoá, đổi trả, khiếu nại |

## 2. Thuế GTGT áp dụng cho hàng tạp hoá

| Thuế suất | Ví dụ hàng tạp hoá | Ghi chú |
|---|---|---|
| **5%** | Rau, củ, quả, thịt, cá tươi sống / sơ chế ở khâu kinh doanh thương mại; đường; nước sạch đóng bình cho sinh hoạt (tuỳ loại) | Đối chiếu Điều 9 Luật Thuế GTGT |
| **8%** | Phần lớn hàng chế biến: mì gói, bánh kẹo, dầu ăn, nước mắm, hoá mỹ phẩm… | Chỉ đến **31/12/2026**; hàng thuộc Phụ lục NĐ 174 vẫn 10% |
| **10%** | Bia, rượu, thuốc lá (thuộc diện loại trừ), nước giải khát có đường > 5g/100ml (từ 2026)… | |
| **KCT** | Sản phẩm trồng trọt/chăn nuôi chưa chế biến do người sản xuất tự bán | Ít gặp ở cửa hàng bán lẻ |

**Hộ kinh doanh / doanh nghiệp nộp thuế theo phương pháp trực tiếp** không dùng thuế suất trên hoá đơn: dùng **Hoá đơn bán hàng (mẫu số 2)**, thuế tính bằng tỷ lệ % trên doanh thu (phân phối hàng hoá: GTGT 1%, TNCN 0,5% – ⚠ đối chiếu NĐ 68/2026 hiện hành). HKD có doanh thu năm không vượt ngưỡng (**1 tỷ đồng** theo NĐ 141/2026 ⚠) không phải nộp GTGT, TNCN nhưng vẫn phải thông báo doanh thu.

## 3. Hoá đơn điện tử – điều sàn được và không được làm

1. **Phiếu in từ hệ thống không phải hoá đơn.** Hoá đơn hợp lệ phải có chữ ký số của người bán, ký hiệu/số hoá đơn đã đăng ký và (với hoá đơn có mã) mã của cơ quan thuế. Chỉ phần mềm của **tổ chức cung cấp dịch vụ HĐĐT** đã ký hợp đồng với Cục Thuế (VNPT, Viettel, MISA, BKAV, EasyInvoice, FPT…) mới truyền dữ liệu tới cơ quan thuế. Muốn tự làm việc này, sàn phải trở thành tổ chức cung cấp dịch vụ HĐĐT (điều kiện rất cao), nên **không nên**.
2. Đã đổi tên phiếu thành **“PHIẾU THANH TOÁN” / “PHIẾU TÍNH TIỀN”**. “Hoá đơn bán hàng” là tên một loại hoá đơn pháp định (mẫu số 2), nên đặt tên đó cho phiếu không phải hoá đơn sẽ gây hiểu nhầm.
3. **HKD doanh thu từ 1 tỷ đồng/năm trở lên bán lẻ trực tiếp cho người tiêu dùng**: bắt buộc dùng **HĐĐT khởi tạo từ máy tính tiền** (ký hiệu chữ thứ 4 là `M`, vd `1C26MAA`/`2C26MAA`), lập cho **từng lần bán**.
4. **Thời điểm lập hoá đơn** = thời điểm chuyển giao quyền sở hữu hàng hoá, không phụ thuộc đã thu tiền hay chưa. Với đơn online giao tận nhà, đó là lúc giao hàng thành công.
5. **Ký hiệu hoá đơn**: ký tự đầu là mẫu số (1 = GTGT, 2 = bán hàng). Tiếp theo là 6 ký tự: `C`/`K` (có/không mã), 2 số cuối của năm, 1 chữ loại (T, D, L, M, N, B, G, H; TT 32/2025 thêm `X` cho hoá đơn TMĐT), 2 chữ do người bán đặt. Số hoá đơn tối đa 8 chữ số, tăng liên tục trong năm.
6. Hoá đơn sai sót được xử lý bằng **hoá đơn điều chỉnh / thay thế** trên phần mềm HĐĐT (Điều 19 NĐ 123/2020 sửa đổi). Không xoá, không sửa trực tiếp.
7. **Sàn phải tự xuất hoá đơn điện tử** cho phí gói dịch vụ thu của đối tác (doanh thu của pháp nhân vận hành sàn). Thuế suất của phí nền tảng phụ thuộc cách phân loại dịch vụ (dịch vụ phần mềm có thể thuộc diện không chịu thuế, còn dịch vụ TMĐT/quảng cáo chịu thuế), nên ⚠ cần kế toán thuế xác định.

### Đã triển khai trong code
- `Product.vatRate` + `OrderItem.vatRate` (snapshot lúc bán) + `OrderItem.unit`.
- Cài đặt → **Thuế & hoá đơn**: phương pháp tính thuế (khấu trừ / trực tiếp / dưới ngưỡng), thuế suất mặc định, nhà cung cấp HĐĐT, ký hiệu, link tra cứu.
- Phiếu in: chỉ tách thuế theo từng thuế suất khi cửa hàng theo phương pháp **khấu trừ**. Giảm giá được phân bổ theo dòng, phí ship không đưa vào bảng thuế.
- Khách **yêu cầu xuất hoá đơn** (cá nhân / tổ chức, kiểm tra định dạng MST) khi đặt hàng hoặc trong chi tiết đơn. Cửa hàng phát hành trên phần mềm HĐĐT rồi **ghi nhận ký hiệu/số/mã CQT/mã tra cứu**, khách thấy ngay trong đơn và trên phiếu in (bảng `EInvoice`).
- Báo cáo: bảng **tổng hợp thuế GTGT theo thuế suất** (tham khảo để đối chiếu).

### Bước tiếp theo đề xuất (chưa làm)
- Tích hợp API của 1 nhà cung cấp HĐĐT (đa số có REST API + sandbox): tự lập hoá đơn khi đơn chuyển `COMPLETED`/thanh toán POS và ghi kết quả vào `EInvoice`. Thông tin đăng nhập API là **của từng đối tác**, phải lưu mã hoá.
- Cảnh báo tự động trước 31/12/2026 để chuyển các sản phẩm 8% về 10% (nếu không có văn bản gia hạn).

## 4. Nghĩa vụ của chính sàn (pháp nhân vận hành)

1. **Đăng ký** website/ứng dụng cung cấp dịch vụ TMĐT với Bộ Công Thương (online.gov.vn) và công khai **Quy chế hoạt động**.
2. **Xác thực danh tính người bán** trước khi mở gian hàng (Luật TMĐT 2025, NĐ 248/2026). Code đã có bước bắt buộc *“Xác thực danh tính”* trước khi duyệt. Hiện bước này ghi nhận thủ công phương thức (VNeID / eKYC / đối chiếu bản gốc). ⚠ Muốn tuân thủ đầy đủ cần tích hợp dịch vụ xác thực điện tử (VNeID / eKYC đối chiếu CSDL quốc gia về dân cư) qua đơn vị được cấp phép.
3. **Thuế cho đối tác là HKD – VNPay đang TẮT (08/11/2026).** VNPay dùng mã merchant chung của sàn → nếu bật, tiền hàng đi qua tài khoản sàn và sàn thuộc diện **khấu trừ, khai thay, nộp thay thuế GTGT + TNCN** cho đối tác HKD (NĐ 117/2025 → NĐ 252/2026 ⚠). Hiện khách chỉ thanh toán COD hoặc chuyển khoản VietQR thẳng vào tài khoản cửa hàng → sàn không thu hộ, chỉ còn nghĩa vụ cung cấp thông tin cho cơ quan thuế. Công tắc nằm ở **Super admin → Cấu hình sàn** (cần có khoá VNPay trên server); hợp đồng sinh ra tự đổi điều khoản theo công tắc này. Chỉ bật lại khi đã có module đối soát + khấu trừ thuế.
4. **Bảo vệ dữ liệu cá nhân**: giấy tờ lưu trong DB (bảng `PartnerDocument`), không có URL công khai, chỉ chủ hồ sơ và super admin xem được. Nhật ký hệ thống (`AuditLog`) đã được che body/response của các route đối tác để không sao chép CCCD và số tài khoản. Hồ sơ có checkbox đồng ý xử lý dữ liệu riêng, lưu thời điểm và IP.

## 5. Quy trình đăng ký đối tác (đã triển khai)

```
Trang chủ "Trở thành đối tác" → /partner (quy trình, giấy tờ, bảng giá)
  → /partner/register (bắt buộc đăng nhập tài khoản khách hàng)
     DRAFT: điền 5 nhóm thông tin + đồng ý điều khoản & xử lý dữ liệu → tải giấy tờ (ảnh/PDF ≤ 4MB)
     → Nộp → SUBMITTED  (thông báo + email cho super admin)
Super admin /super/applications/:id
     → (tuỳ) Yêu cầu bổ sung → NEED_INFO → đối tác sửa & nộp lại
     → Xác thực danh tính (VNeID / eKYC / bản gốc)          [bắt buộc]
     → Duyệt: chọn gói, số tháng, phí → sinh Hợp đồng (snapshot + SHA-256) → APPROVED, email mời ký
Đối tác ký điện tử: nhập đúng họ tên người đại diện + xác nhận → lưu thời điểm, IP, thiết bị, mã băm
     (hoặc super admin xác nhận đã ký bằng chữ ký số / bản giấy)
Đối tác chuyển khoản VietQR (nội dung = mã hồ sơ) → super admin xác nhận đã nhận phí
     → Kích hoạt: tạo Store + StorePayment, cấp quyền ADMIN cho chính tài khoản đã đăng ký → ACTIVATED
```

**Vì sao dùng tài khoản của người đăng ký thay vì để super admin tạo tài khoản mới:** super admin không phải biết/đặt mật khẩu của đối tác, tránh gửi mật khẩu qua email, và người đã ký hợp đồng chính là người đăng nhập. Đó cũng là bằng chứng gắn chữ ký điện tử với người ký.

### Giấy tờ yêu cầu
| | Hộ kinh doanh | Doanh nghiệp |
|---|---|---|
| Giấy chứng nhận ĐKKD | GCN đăng ký HKD ★ | GCN đăng ký doanh nghiệp ★ |
| Giấy tờ tuỳ thân | CCCD chủ hộ 2 mặt ★ | CCCD người đại diện theo pháp luật 2 mặt ★ |
| Mã số thuế | Số định danh cá nhân 12 số của chủ hộ (từ 01/07/2025) hoặc MST 10 số cũ | MST 10 số |
| Uỷ quyền | – | Giấy uỷ quyền nếu người ký không phải đại diện theo pháp luật |
| Ngân hàng | TK đứng tên chủ hộ/HKD | TK đứng tên doanh nghiệp |
| ATTP | GCN cơ sở đủ điều kiện ATTP hoặc Bản cam kết (tuỳ diện) | như HKD |
| Hàng có điều kiện | Giấy phép bán lẻ rượu / sản phẩm thuốc lá (nếu bán) | như HKD |

★ = bắt buộc trong hệ thống. Sàn **không nhận cá nhân chưa đăng ký kinh doanh**, vì cửa hàng tạp hoá có địa điểm cố định không thuộc diện được miễn đăng ký HKD.

### Hợp đồng
- Mẫu: `backend/src/partners/contract.ts`, *Hợp đồng cung cấp dịch vụ nền tảng TMĐT*, gồm 10 điều: đối tượng, phí, thời hạn, quyền/nghĩa vụ hai bên (gồm xác thực người bán, gỡ hàng vi phạm, khấu trừ thuế nếu có, đối soát), dữ liệu cá nhân, tạm ngưng/chấm dứt, bất khả kháng, tranh chấp, giao kết điện tử.
- **Bắt buộc khai báo Bên A** tại **Super admin → Cấu hình sàn** (`/super/platform`): tên doanh nghiệp, MST, địa chỉ, người đại diện, số đăng ký sàn TMĐT, tài khoản nhận phí. Hệ thống chặn duyệt hồ sơ nếu thiếu.
- Chữ ký điện tử dạng *đăng nhập + nhập họ tên + đồng ý* có giá trị theo Luật GDĐT 2023 nhưng khả năng chứng minh khi tranh chấp thấp hơn **chữ ký số**. Với hợp đồng giá trị lớn nên dùng dịch vụ eContract có chữ ký số (VNPT eContract, FPT.eContract, MISA AMIS WeSign…), rồi dùng nút *“Đã ký số / bản giấy”*.
- ⚠ Cho luật sư rà soát mẫu hợp đồng và Quy chế hoạt động trước khi dùng thật.

### Gói dịch vụ, gói Miễn phí & mua thêm hạn mức
- **Mặc định gói Miễn phí** (mã `free`, không thời hạn): hồ sơ đăng ký chọn sẵn gói này; cửa hàng tạo không chọn gói (super admin hoặc kích hoạt hồ sơ) cũng nhận gói này. Gói 0đ luôn *không thời hạn*, không ghi phiếu thu.
- **Gói mua thêm (add-on)**: cộng thêm hạn mức vào gói chính (sản phẩm, đơn hàng/tháng, nhân viên, chiến dịch/tháng). Hạn mức thực tế = hạn mức gói + tổng gói mua thêm còn hiệu lực. Gói chính đã “không giới hạn” loại nào thì không bán gói mua thêm loại đó. Bảng giá quản lý tại **Super admin → Gói mua thêm & đơn mua** (`/super/addons`); 8 gói mẫu được tạo sẵn (vd. *Thêm 30 sản phẩm – 150.000đ, không thời hạn*).
- **Đổi gói trực tiếp trên hồ sơ**: đối tác hoặc super admin đổi gói / số tháng / gói mua thêm khi hồ sơ đang soạn, đang thẩm định, hoặc đã duyệt nhưng **chưa ký và chưa thanh toán**. Nếu đã duyệt, hợp đồng được **sinh lại** (giữ số HĐ, mã băm mới) và đối tác được báo đọc lại. Sau khi ký: đổi gói sau khi kích hoạt.
- **Sau khi kích hoạt**: chủ cửa hàng vào *Gói dịch vụ* để mua thêm hạn mức hoặc đổi / gia hạn gói → đơn chờ thanh toán (VietQR vào tài khoản phí của sàn, nội dung = mã đơn `MT…`/`GH…`) → super admin đối chiếu sao kê, bấm *Đã nhận tiền* → hệ thống cộng hạn mức / đổi gói và ghi phiếu thu. Super admin cũng có thể cấp trực tiếp (tặng) hoặc thu hồi.
- Pháp lý: hợp đồng (Điều 2) ghi rõ gói mua thêm ký kèm và quyền mua thêm theo bảng giá công bố; sàn phải **xuất hoá đơn điện tử cho mọi khoản phí** (phí gói và phí mua thêm) – đây là doanh thu dịch vụ của sàn, chịu thuế GTGT theo thuế suất của dịch vụ phần mềm/nền tảng mà sàn áp dụng. Giá niêm yết đã gồm thuế.

## 6. Triển khai

```bash
cd backend
npx prisma migrate deploy        # 20261108090000_vat_einvoice_partner_applications, 20261108100000_platform_settings,
                                 # 20261108110000_addon_packs_store_purchases (tạo gói Miễn phí + 8 gói mua thêm mẫu)
npx prisma generate
# sau đó vào Super admin → Cấu hình sàn để khai báo pháp nhân & tài khoản nhận phí
```

Sau khi deploy, mỗi đối tác cần: (1) khai báo phương pháp tính thuế và thuế suất mặc định, (2) cập nhật thuế suất cho từng sản phẩm, (3) nếu nhận xuất hoá đơn thì nhập nhà cung cấp HĐĐT, ký hiệu và link tra cứu. Các đơn cũ không có `vatRate` sẽ được báo cáo đánh dấu là "Chưa khai báo thuế suất".
