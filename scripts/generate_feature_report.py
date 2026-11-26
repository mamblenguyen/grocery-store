from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Bao-cao-tinh-nang-he-thong-grocery-store.docx"
GREEN = "0A9C4B"
DARK = "0F172A"
LIGHT = "EFFDF4"
GRAY = "64748B"


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def margins(section):
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.space_before = Pt(10 if level == 1 else 7)
    p.paragraph_format.space_after = Pt(5)
    return p


def add_bullets(doc, items, level=0):
    for item in items:
        p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        p.add_run(item)
        p.paragraph_format.space_after = Pt(2)


def add_numbered(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        p.add_run(item)
        p.paragraph_format.space_after = Pt(3)


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    header = table.rows[0]
    set_repeat_table_header(header)
    for i, title in enumerate(headers):
        cell = header.cells[i]
        shade(cell, GREEN)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        run = cell.paragraphs[0].add_run(title)
        run.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cells[i].text = str(value)
            if len(table.rows) % 2 == 0:
                shade(cells[i], "F8FAFC")
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


doc = Document()
for section in doc.sections:
    margins(section)

styles = doc.styles
styles["Normal"].font.name = "Arial"
styles["Normal"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
styles["Normal"].font.size = Pt(10.5)
styles["Normal"].font.color.rgb = RGBColor.from_string(DARK)
for name, size, color in [("Title", 25, GREEN), ("Heading 1", 17, GREEN), ("Heading 2", 13, DARK), ("Heading 3", 11, DARK)]:
    styles[name].font.name = "Arial"
    styles[name]._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    styles[name].font.size = Pt(size)
    styles[name].font.color.rgb = RGBColor.from_string(color)

# Trang bìa
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(75)
r = p.add_run("BÁO CÁO TÍNH NĂNG HỆ THỐNG")
r.bold = True
r.font.name = "Arial"
r.font.size = Pt(25)
r.font.color.rgb = RGBColor.from_string(GREEN)
p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p2.add_run("Nền tảng Grocery Store đa cửa hàng")
r.bold = True
r.font.size = Pt(18)
r.font.color.rgb = RGBColor.from_string(DARK)
p3 = doc.add_paragraph()
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
p3.paragraph_format.space_before = Pt(20)
r = p3.add_run("Web bán hàng · Quản trị · Ứng dụng di động · Giao hàng")
r.font.size = Pt(12)
r.font.color.rgb = RGBColor.from_string(GRAY)

box = doc.add_table(rows=4, cols=2)
box.alignment = WD_TABLE_ALIGNMENT.CENTER
box.style = "Table Grid"
for cell in box._cells:
    shade(cell, LIGHT)
info = [("Dự án", "grocery-store"), ("Ngày lập báo cáo", "06/11/2026"), ("Phạm vi", "Backend, website, ứng dụng Expo"), ("Trạng thái", "Đang phát triển – đã build và kiểm tra kiểu dữ liệu")]
for row, (label, value) in zip(box.rows, info):
    row.cells[0].text = label
    row.cells[0].paragraphs[0].runs[0].bold = True
    row.cells[1].text = value

doc.add_paragraph()
p = doc.add_paragraph("Tài liệu tổng hợp hiện trạng chức năng, kết quả kiểm tra và kế hoạch phát triển đề xuất cho hệ thống.")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.runs[0].italic = True
p.runs[0].font.color.rgb = RGBColor.from_string(GRAY)
doc.add_page_break()

add_heading(doc, "1. Tổng quan hệ thống")
doc.add_paragraph(
    "Grocery Store là nền tảng thương mại điện tử và quản lý bán lẻ đa cửa hàng. Mỗi đối tác có dữ liệu, "
    "website, tài khoản nhân viên, kho hàng, đơn hàng và cấu hình thanh toán riêng. Hệ thống phục vụ khách hàng, "
    "nhân viên cửa hàng, chủ cửa hàng, tài xế và quản trị viên nền tảng."
)
add_table(doc, ["Thành phần", "Công nghệ", "Vai trò"], [
    ("Backend API", "NestJS 11, Prisma 6, MySQL 8", "Nghiệp vụ, phân quyền, dữ liệu và tích hợp"),
    ("Website", "Next.js 15, React 19, Tailwind CSS 4", "Cửa hàng trực tuyến, quản trị và tài xế"),
    ("Ứng dụng", "Expo SDK 58, React Native, Expo Router", "Khách hàng, nhân viên, quản trị và tài xế"),
    ("Triển khai", "GitHub Actions, Vercel, EAS", "CI/CD, web/API và bản build ứng dụng"),
], [3.2, 6.0, 8.0])

add_heading(doc, "2. Nhóm người dùng")
add_table(doc, ["Vai trò", "Phạm vi sử dụng", "Năng lực chính"], [
    ("Super Admin", "Toàn nền tảng", "Đối tác, gói dịch vụ, tài xế, thanh toán và người dùng"),
    ("Chủ cửa hàng", "Một cửa hàng", "Bán hàng, kho, nhân viên, cấu hình và báo cáo"),
    ("Nhân viên", "Cửa hàng được phân công", "POS, đơn hàng, kho và báo cáo vận hành"),
    ("Khách hàng", "Toàn sàn/nhiều cửa hàng", "Mua hàng, thanh toán, địa chỉ, yêu thích và đánh giá"),
    ("Tài xế", "Vùng hoạt động", "Nhận chuyến, chỉ đường, giao hàng, COD và thu nhập"),
], [3.0, 5.0, 9.2])

add_heading(doc, "3. Tính năng hiện có")

sections = {
    "3.1. Sàn và cửa hàng trực tuyến": [
        "Trang chủ sàn tổng hợp sản phẩm từ nhiều cửa hàng; danh bạ cửa hàng và website riêng theo slug/subdomain.",
        "Tìm kiếm, lọc theo danh mục, giá, thương hiệu, tồn kho và sắp xếp sản phẩm.",
        "Chi tiết sản phẩm có biến thể, hình ảnh, tồn kho, đánh giá và sản phẩm liên quan.",
        "Giỏ hàng chung chia nhóm theo cửa hàng; mỗi nhóm có thanh toán và giao hàng riêng.",
        "Giao diện đáp ứng cho desktop, tablet và điện thoại; có giỏ hàng trượt và điều hướng mobile.",
    ],
    "3.2. Thanh toán và đơn hàng": [
        "Checkout theo sổ địa chỉ, đơn vị hành chính Việt Nam, ngày và khung giờ giao hàng.",
        "COD, chuyển khoản VietQR và VNPay; máy chủ tính lại giá, phí giao hàng và ưu đãi.",
        "Theo dõi trạng thái đơn, lịch sử giao dịch, huỷ đơn, mua lại và in hoá đơn.",
        "Luồng trạng thái có hoàn kho khi huỷ và kiểm soát bán vượt tồn trong transaction.",
    ],
    "3.3. Quản trị cửa hàng": [
        "Dashboard doanh thu, số đơn, sản phẩm bán chạy và cảnh báo tồn kho.",
        "POS hỗ trợ quét USB/Bluetooth/camera, nhiều hoá đơn chờ, giảm giá, tiền mặt và QR.",
        "Quản lý sản phẩm nhiều biến thể, danh mục, mã giảm giá, khách hàng, đánh giá và nhân viên.",
        "Cài đặt cửa hàng, ngân hàng, giao hàng, banner, mạng xã hội và vị trí lấy hàng.",
        "Báo cáo doanh thu, giá vốn, lợi nhuận, biên lợi nhuận và phân tích theo nhiều chiều.",
    ],
    "3.4. Kho hàng": [
        "Tồn kho theo biến thể, lịch sử nhập/xuất/điều chỉnh và ngưỡng cảnh báo.",
        "Phiếu nhập, xuất, kiểm kê với quy trình Nháp – Hoàn tất – Huỷ.",
        "Giá vốn bình quân gia quyền, số lô, hạn sử dụng và nhà cung cấp.",
        "In phiếu kho và tem QR; tra cứu sản phẩm bằng SKU, barcode hoặc QR.",
    ],
    "3.5. Giao hàng": [
        "Tự tìm tài xế theo vùng hoạt động, giới hạn chuyến đồng thời và khoảng cách.",
        "Tài xế nhận/trả chuyến, xác nhận lấy hàng, giao thành công hoặc thất bại.",
        "Theo dõi GPS, chỉ đường, gọi cửa hàng/khách và quản lý tiền COD.",
        "Khách hàng và cửa hàng theo dõi tiến trình và vị trí tài xế.",
    ],
    "3.6. Quản trị nền tảng": [
        "Tạo và quản lý đối tác, thông tin pháp lý, hợp đồng, tài khoản đối soát và cửa hàng.",
        "Gói dịch vụ, giới hạn sản phẩm/nhân viên, thời hạn, gia hạn và phiếu thu.",
        "Quản lý tài xế toàn sàn, người dùng, trạng thái cửa hàng và quản trị hộ.",
        "Cách ly dữ liệu đa tenant theo cửa hàng và vai trò tài khoản.",
    ],
    "3.7. Ứng dụng di động": [
        "Mua sắm, giỏ hàng, checkout, đơn hàng, đánh giá, yêu thích và thông báo.",
        "POS, tra cứu mã, quản lý đơn, kho, báo cáo và in cho nhân viên.",
        "Màn hình quản trị nền tảng, cửa hàng và tài xế.",
        "Token đăng nhập lưu bằng SecureStore trên thiết bị; hỗ trợ deep link và push notification.",
    ],
}
for title, items in sections.items():
    add_heading(doc, title, level=2)
    add_bullets(doc, items)

add_heading(doc, "4. Các cải tiến đã triển khai gần nhất")
add_bullets(doc, [
    "Bổ sung địa chỉ chuẩn Tỉnh/Thành phố – Quận/Huyện – Phường/Xã cho cửa hàng, đối tác và khách hàng.",
    "Bổ sung vùng hoạt động nhiều cấp cho tài xế và lọc chuyến theo khu vực.",
    "Chuẩn hoá popup xác nhận trên web và mobile; loại bỏ Alert.alert, confirm() và prompt() mặc định.",
    "Popup phân biệt thao tác nguy hiểm, mô tả hậu quả, hỗ trợ Escape/chạm nền và accessibility.",
    "Popup nhập liệu có validation cho lý do huỷ và đặt lại mật khẩu.",
    "Push notification đọc EAS projectId từ EAS Build hoặc biến EXPO_PUBLIC_EAS_PROJECT_ID.",
    "Chuyển cấu hình Prisma CLI và seed sang prisma.config.ts để chuẩn bị nâng cấp Prisma.",
    "Trường mật khẩu nhân viên được che ký tự và khai báo autocomplete phù hợp.",
])

add_heading(doc, "5. Kết quả kiểm tra kỹ thuật")
add_table(doc, ["Hạng mục", "Kết quả", "Ghi chú"], [
    ("Web production build", "Đạt", "Next.js biên dịch và sinh 43 trang thành công"),
    ("Mobile TypeScript", "Đạt", "tsc --noEmit không có lỗi"),
    ("Backend TypeScript", "Đạt", "Không có lỗi kiểu dữ liệu"),
    ("Prisma config/schema", "Đạt", "prisma.config.ts được nhận và schema hợp lệ"),
    ("Expo public config", "Đạt", "SDK 58, plugin và quyền hệ thống được nhận"),
    ("Expo Doctor", "Cần bổ sung", "Thiếu expo-font và expo-asset trước khi build độc lập"),
    ("Automated tests", "Cần phát triển", "Hiện chủ yếu có smoke test backend"),
], [5.0, 3.0, 9.2])

add_heading(doc, "6. Tính năng đề xuất phát triển")
add_table(doc, ["Ưu tiên", "Tính năng", "Giá trị mang lại", "Phạm vi chính"], [
    ("P0", "Đổi trả, hoàn tiền, khiếu nại", "Hoàn thiện vòng đời đơn và giảm xử lý thủ công", "Yêu cầu trả hàng, duyệt, hoàn kho, hoàn tiền, bằng chứng"),
    ("P0", "Audit log toàn hệ thống", "Truy vết thay đổi và giảm rủi ro vận hành", "Người thao tác, trước/sau, IP, thiết bị, quản trị hộ"),
    ("P0", "Đối soát COD và thanh toán", "Kiểm soát dòng tiền chính xác", "Phiên đối soát, chênh lệch, công nợ và khoá kỳ"),
    ("P1", "Tích điểm và hạng thành viên", "Tăng tỷ lệ khách quay lại", "Điểm, hạng, voucher, sinh nhật và lịch sử"),
    ("P1", "Khuyến mãi nâng cao", "Tăng giá trị đơn hàng", "Combo, mua X tặng Y, flash sale, giá theo hạng"),
    ("P1", "CRM và marketing automation", "Chăm sóc đúng nhóm khách", "Phân khúc, giỏ bỏ quên, nhắc mua lại và đo chuyển đổi"),
    ("P1", "Đơn mua nhà cung cấp", "Chuẩn hoá quy trình nhập hàng", "Đặt mua, nhận một phần, chênh lệch và công nợ NCC"),
    ("P2", "Gợi ý tái đặt hàng", "Giảm thiếu hàng và tồn lâu", "Tốc độ bán, lead time, tồn tối thiểu và dự báo"),
    ("P2", "Hoá đơn điện tử", "Đáp ứng vận hành thực tế", "Phát hành, điều chỉnh, thay thế, huỷ và tra cứu"),
    ("P2", "POS/kiểm kho offline", "Duy trì bán hàng khi mạng yếu", "Cache dữ liệu, hàng đợi đồng bộ và chống gửi trùng"),
    ("P2", "Bảo mật nâng cao", "Bảo vệ tài khoản quản trị", "2FA, passkey, phiên đăng nhập và đăng xuất từ xa"),
    ("P3", "Đăng ký giao định kỳ", "Tạo doanh thu lặp lại", "Lịch giao, bỏ qua kỳ, đổi số lượng và ưu đãi"),
    ("P3", "Trung tâm hỗ trợ", "Theo dõi chất lượng phục vụ", "Ticket, chat, SLA, mẫu trả lời và đánh giá"),
], [1.5, 4.3, 5.5, 7.0])

add_heading(doc, "7. Roadmap đề xuất")
add_table(doc, ["Giai đoạn", "Mục tiêu", "Hạng mục"], [
    ("Giai đoạn 1", "Sẵn sàng vận hành an toàn", "Dependency mobile, EAS push, audit log, 2FA, đổi trả/hoàn tiền, đối soát COD"),
    ("Giai đoạn 2", "Tăng giữ chân khách hàng", "Tích điểm, hạng thành viên, khuyến mãi nâng cao, CRM"),
    ("Giai đoạn 3", "Tối ưu kho và mua hàng", "Đơn mua NCC, gợi ý tái nhập, hàng chậm bán, dashboard nâng cao"),
    ("Giai đoạn 4", "Mở rộng production", "POS offline, hoá đơn điện tử, giao hàng định kỳ"),
    ("Giai đoạn 5", "Tự động hoá và mở rộng", "Trung tâm hỗ trợ, passkey, dự báo và trợ lý AI"),
], [2.5, 4.5, 10.8])

add_heading(doc, "8. Khuyến nghị ưu tiên")
doc.add_paragraph("Nếu chỉ triển khai một tính năng tiếp theo, nên chọn quy trình đổi trả và hoàn tiền vì đây là khoảng trống nghiệp vụ lớn nhất trong vòng đời đơn hàng hiện tại.")
add_numbered(doc, [
    "Hoàn thiện dependency và EAS projectId để phát hành ứng dụng ổn định.",
    "Thiết kế mô hình ReturnRequest, ReturnItem, Refund và lịch sử trạng thái.",
    "Xây API transaction cho hoàn kho và hoàn tiền một phần/toàn phần.",
    "Xây giao diện khách gửi yêu cầu và giao diện cửa hàng duyệt xử lý.",
    "Bổ sung test cho đặt hàng, huỷ, trả hàng, hoàn kho, thanh toán và phân quyền tenant.",
])

add_heading(doc, "9. Rủi ro và lưu ý")
add_bullets(doc, [
    "Không triển khai quá nhiều module mới trước khi có automated test cho các luồng tiền, kho và phân quyền.",
    "Mọi thay đổi tồn kho, hoàn tiền và đối soát phải có transaction, idempotency và audit log.",
    "Cần cấu hình EAS projectId và credential FCM/APNs thật trước khi kiểm thử push trên thiết bị.",
    "Cần rà soát thủ tục thông báo/đăng ký website và ứng dụng thương mại điện tử trước khi vận hành công khai.",
    "Hoá đơn hiện tại là chứng từ bán lẻ nội bộ; hoá đơn điện tử cần tích hợp nhà cung cấp được phép.",
])

add_heading(doc, "10. Kết luận")
doc.add_paragraph(
    "Hệ thống đã bao phủ phần lớn nghiệp vụ cốt lõi của nền tảng bán lẻ đa cửa hàng: bán hàng online, POS, kho, thanh toán, "
    "giao hàng, quản trị đối tác và ứng dụng di động. Trọng tâm tiếp theo nên chuyển từ mở rộng số lượng màn hình sang hoàn thiện "
    "vòng đời sau bán hàng, kiểm soát tài chính, bảo mật, kiểm thử tự động và khả năng vận hành production."
)

# Header/footer
for section in doc.sections:
    header = section.header.paragraphs[0]
    header.text = "GROCERY STORE  |  BÁO CÁO TÍNH NĂNG"
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header.runs[0].font.size = Pt(8)
    header.runs[0].font.color.rgb = RGBColor.from_string(GRAY)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run("Tài liệu nội bộ · 06/11/2026 · Trang ")
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    footer._p.append(fld)
    for run in footer.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = RGBColor.from_string(GRAY)

doc.core_properties.title = "Báo cáo tính năng hệ thống Grocery Store"
doc.core_properties.subject = "Tổng hợp hiện trạng và roadmap phát triển"
doc.core_properties.author = "Grocery Store Project"
doc.core_properties.keywords = "grocery store, tính năng, web, mobile, roadmap"
doc.save(OUTPUT)
print(OUTPUT)
