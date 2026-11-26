'use client';
import { ArrowRight, BadgeCheck, CheckCircle2, FileSignature, FileText, Handshake, ScanFace, ShieldCheck, Store, Wallet } from 'lucide-react';
import Link from 'next/link';
import { LIMIT_UNIT, packDuration } from '@/lib/billing';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { PartnerInfo } from '@/lib/partner';
import { PLATFORM_NAME } from '@/lib/platform';

const STEPS = [
  { icon: FileText, title: 'Nộp hồ sơ online', text: 'Điền thông tin cửa hàng, pháp lý, tài khoản ngân hàng, chọn gói và tải ảnh/PDF giấy tờ.' },
  { icon: ScanFace, title: 'Thẩm định & xác thực', text: 'Sàn kiểm tra giấy tờ và xác thực danh tính người bán (VNeID / eKYC) theo Luật Thương mại điện tử 2025.' },
  { icon: FileSignature, title: 'Ký hợp đồng điện tử', text: 'Đọc toàn văn hợp đồng, ký điện tử trên hệ thống (hoặc ký số / bản giấy).' },
  { icon: Wallet, title: 'Thanh toán phí gói', text: 'Chuyển khoản qua VietQR với nội dung là mã hồ sơ. Sàn xuất hoá đơn điện tử cho phí dịch vụ.' },
  { icon: Store, title: 'Kích hoạt cửa hàng', text: 'Tài khoản của bạn được cấp quyền Chủ cửa hàng – vào trang quản trị để đăng sản phẩm và bán hàng.' },
];

const DOCS_BY_TYPE = [
  {
    title: 'Hộ kinh doanh',
    items: [
      ['Giấy chứng nhận đăng ký hộ kinh doanh', true],
      ['CCCD gắn chip của chủ hộ (2 mặt)', true],
      ['Mã số thuế: số định danh cá nhân 12 số của chủ hộ (từ 01/07/2025)', true],
      ['Tài khoản ngân hàng đứng tên chủ hộ / hộ kinh doanh', true],
      ['Giấy CN cơ sở đủ điều kiện ATTP hoặc Bản cam kết bảo đảm ATTP (nếu thuộc diện)', false],
      ['Giấy phép bán lẻ rượu / sản phẩm thuốc lá (nếu kinh doanh)', false],
    ],
  },
  {
    title: 'Doanh nghiệp',
    items: [
      ['Giấy chứng nhận đăng ký doanh nghiệp (MST 10 số)', true],
      ['CCCD của người đại diện theo pháp luật (2 mặt)', true],
      ['Giấy uỷ quyền nếu người ký hợp đồng không phải đại diện theo pháp luật', false],
      ['Tài khoản ngân hàng đứng tên doanh nghiệp', true],
      ['Giấy CN cơ sở đủ điều kiện ATTP (nếu thuộc diện)', false],
      ['Giấy phép bán lẻ rượu / sản phẩm thuốc lá (nếu kinh doanh)', false],
    ],
  },
] as const;

export default function PartnerLanding() {
  const [info, setInfo] = useState<PartnerInfo | null>(null);
  useEffect(() => { api<PartnerInfo>('/partner/info').then(setInfo).catch(() => {}); }, []);
  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 text-white">
        <div className="container-x py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm"><Handshake className="h-4 w-4" /> Chương trình đối tác</span>
          <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold sm:text-5xl">Đưa tạp hoá của bạn lên {PLATFORM_NAME}</h1>
          <p className="mt-3 max-w-2xl text-brand-50 sm:text-lg">Gian hàng online + bán tại quầy (POS) + quản lý kho + tài xế giao hàng của sàn. Đăng ký online, ký hợp đồng điện tử, kích hoạt trong 1–3 ngày làm việc.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/partner/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 shadow-lift hover:bg-brand-50" data-testid="partner-start">Đăng ký ngay <ArrowRight className="h-4 w-4" /></Link>
            <a href="#giay-to" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-semibold hover:bg-white/25">Giấy tờ cần chuẩn bị</a>
          </div>
        </div>
      </section>

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold text-ink">Quy trình 5 bước</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card">
              <div className="flex items-center gap-2 text-brand-700"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-bold">{i + 1}</span><s.icon className="h-5 w-5" /></div>
              <div className="mt-3 font-bold text-ink">{s.title}</div>
              <p className="mt-1 text-sm text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="giay-to" className="container-x py-6">
        <h2 className="text-2xl font-bold text-ink">Giấy tờ cần chuẩn bị</h2>
        <p className="mt-1 text-sm text-slate-500">Ảnh chụp rõ nét hoặc bản scan PDF, tối đa 4MB/file. Thông tin trên hồ sơ phải khớp với giấy tờ.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {DOCS_BY_TYPE.map((g) => (
            <div key={g.title} className="card">
              <h3 className="font-bold text-ink">{g.title}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {g.items.map(([t, req]) => (
                  <li key={t} className="flex gap-2"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${req ? 'text-brand-600' : 'text-slate-300'}`} /><span>{t}{req ? <b className="ml-1 text-red-600">*</b> : <span className="ml-1 text-slate-400">(tuỳ trường hợp)</span>}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <b>Lưu ý pháp lý:</b> cửa hàng tạp hoá có địa điểm cố định phải đăng ký hộ kinh doanh hoặc doanh nghiệp – sàn không nhận cá nhân chưa đăng ký kinh doanh mở gian hàng.
          Sau khi kích hoạt, bạn tự chịu trách nhiệm kê khai, nộp thuế và xuất hoá đơn cho người mua theo quy định (hộ kinh doanh doanh thu từ 1 tỷ đồng/năm phải dùng hoá đơn điện tử khởi tạo từ máy tính tiền).
        </div>
      </section>

      <section className="container-x py-10">
        <h2 className="text-2xl font-bold text-ink">Bảng giá gói dịch vụ</h2>
        <p className="mt-1 text-sm text-slate-500">Đối tác mới mặc định dùng <b>gói Miễn phí</b> (không thời hạn). Có thể chọn gói trả phí ngay khi đăng ký, hoặc nâng cấp / mua thêm hạn mức bất cứ lúc nào.</p>
        {!info ? <Spinner /> : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {info.plans.map((p) => (
              <div key={p.id} className="card flex flex-col">
                <div className="flex items-center gap-2 font-bold text-ink"><BadgeCheck className="h-5 w-5 text-brand-600" />{p.name}</div>
                <div className="mt-2 text-2xl font-extrabold text-brand-700">{p.priceMonthly ? money(p.priceMonthly) : 'Miễn phí'}<span className="text-sm font-medium text-slate-400">{p.priceMonthly ? '/tháng' : ''}</span></div>
                {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
                <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                  <li>• {p.maxProducts == null ? 'Không giới hạn' : p.maxProducts.toLocaleString('vi-VN')} sản phẩm</li>
                  <li>• {p.maxStaff == null ? 'Không giới hạn' : p.maxStaff} nhân viên</li>
                  <li>• {p.maxOrdersMonthly == null ? 'Không giới hạn' : p.maxOrdersMonthly.toLocaleString('vi-VN')} đơn/tháng</li>
                </ul>
                <Link href={`/partner/register?plan=${p.id}`} className="btn-outline mt-4 justify-center">Chọn gói này</Link>
              </div>
            ))}
          </div>
        )}
        {!!info?.addonPacks.length && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-ink">Mua thêm hạn mức</h3>
            <p className="text-sm text-slate-500">Cần thêm sản phẩm, đơn hàng hay nhân viên mà chưa muốn lên gói cao hơn? Mua thêm đúng phần cần dùng.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {info.addonPacks.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-ink">{a.name}</div>
                  <div className="mt-1 text-xl font-extrabold text-brand-700">{money(a.price)}</div>
                  <div className="mt-1 text-xs text-slate-500">+{a.quantity.toLocaleString('vi-VN')} {LIMIT_UNIT[a.kind]} · {packDuration(a.months)}</div>
                  {a.description && <p className="mt-1 text-xs text-slate-400">{a.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {info?.platform.legalName && (
          <p className="mt-6 flex items-start gap-2 text-sm text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Đơn vị vận hành: {info.platform.legalName} – MST {info.platform.taxCode} – {info.platform.address}. Dữ liệu hồ sơ được bảo mật, chỉ dùng để xác thực người bán và thực hiện hợp đồng.</p>
        )}
      </section>
    </>
  );
}
