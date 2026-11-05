'use client';
import { ArrowRight, BarChart3, Boxes, Check, Clock, MapPin, Package, QrCode, Search, ShoppingBag, Smartphone, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLastStore } from '@/components/platform/PlatformShell';
import { Empty, Pagination, Spinner } from '@/components/ui';
import { api, imageUrl, qs } from '@/lib/api';
import { money } from '@/lib/format';
import { PLATFORM_NAME } from '@/lib/platform';
import type { Paged, Plan, PublicStore } from '@/lib/types';

const HOTLINE = process.env.NEXT_PUBLIC_PLATFORM_HOTLINE || '';

function StoreCard({ s }: { s: PublicStore }) {
  return (
    <Link href={`/s/${s.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700">
        {s.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(s.banner)} alt="" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
        )}
        {!s.acceptingOrders && <span className="badge absolute top-3 right-3 bg-amber-100 text-amber-800">Tạm ngưng nhận đơn</span>}
      </div>
      <div className="flex flex-1 flex-col p-4 pt-0">
        <div className="-mt-7 mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-brand-50 text-brand-700 shadow-soft">
          {s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(s.logo)} alt="" className="h-full w-full object-cover" />
          ) : <Store className="h-6 w-6" />}
        </div>
        <h3 className="font-bold text-ink group-hover:text-brand-700">{s.name}</h3>
        {s.slogan && <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{s.slogan}</p>}
        <div className="mt-3 space-y-1.5 text-xs text-slate-500">
          {s.address && <div className="flex gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="line-clamp-1">{s.address}</span></div>}
          {s.openingHours && <div className="flex gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />{s.openingHours}</div>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-slate-500"><Package className="h-4 w-4" />{s.productCount} sản phẩm</span>
          <span className="flex items-center gap-1 font-semibold text-brand-700">Vào mua <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}

const FEATURES = [
  { icon: ShoppingBag, title: 'Website bán hàng riêng', text: 'Mỗi cửa hàng có trang riêng, giỏ hàng, thanh toán COD / VietQR / VNPay.' },
  { icon: QrCode, title: 'Bán tại quầy quét mã', text: 'POS quét mã vạch / QR bằng máy quét hoặc camera, in hoá đơn K80 ngay.' },
  { icon: Boxes, title: 'Quản lý kho chính xác', text: 'Phiếu nhập / xuất / kiểm kê, giá vốn bình quân, hạn sử dụng, in tem.' },
  { icon: BarChart3, title: 'Báo cáo lợi nhuận', text: 'Doanh thu, giá vốn, lợi nhuận theo ngày, kênh bán, danh mục, sản phẩm.' },
  { icon: Smartphone, title: 'App điện thoại', text: 'Một app cho cả khách và nhân viên: đặt hàng, bán hàng, nhập kho bằng camera.' },
];

export default function PlatformHome() {
  const last = useLastStore();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<PublicStore> | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => { setData(null); api<Paged<PublicStore>>('/stores' + qs({ search: q, page, limit: 12 })).then(setData).catch(() => setData({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 })); }, [q, page]);
  useEffect(() => { api<Plan[]>('/stores/plans').then(setPlans).catch(() => {}); }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 text-white">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="container-x relative py-14 sm:py-20">
          <h1 className="max-w-2xl text-3xl leading-tight font-extrabold sm:text-5xl">Đi chợ online tại tạp hoá quen của bạn</h1>
          <p className="mt-4 max-w-xl text-brand-50 sm:text-lg">Chọn cửa hàng gần nhà, đặt hàng trong vài chạm – cửa hàng giao tận nơi hoặc bạn ghé lấy.</p>
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search.trim()); }} className="mt-8 flex h-14 max-w-xl items-center overflow-hidden rounded-2xl bg-white shadow-lift">
            <Search className="ml-4 h-5 w-5 shrink-0 text-slate-400" />
            <input className="h-full w-full min-w-0 bg-transparent px-3 text-ink outline-none placeholder:text-slate-400" placeholder="Tìm theo tên cửa hàng, khu vực…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="mr-2 h-10 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">Tìm</button>
          </form>
          {last && <Link href={`/s/${last.slug}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/25"><Store className="h-4 w-4" /> Tiếp tục mua tại <b>{last.name}</b> <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">{q ? `Kết quả cho “${q}”` : 'Cửa hàng trên nền tảng'}</h2>
            {data && <p className="text-sm text-slate-500">{data.total} cửa hàng đang hoạt động</p>}
          </div>
          {q && <button className="btn-ghost btn-sm" onClick={() => { setQ(''); setSearch(''); }}>Xoá tìm kiếm</button>}
        </div>
        {!data ? <Spinner /> : !data.items.length ? (
          <div className="card"><Empty icon={<Store className="h-7 w-7" />} text="Không tìm thấy cửa hàng phù hợp" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.items.map((s) => <StoreCard key={s.id} s={s} />)}</div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </section>

      <section id="doi-tac" className="scroll-mt-20 bg-white py-14">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge bg-brand-50 text-brand-700">Dành cho chủ cửa hàng</span>
            <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">Đưa tạp hoá của bạn lên {PLATFORM_NAME}</h2>
            <p className="mt-3 text-slate-500">Đầy đủ công cụ bán online, bán tại quầy và quản lý kho – không cần cài đặt máy chủ.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200/70 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
          {plans.length > 0 && (
            <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
              {plans.map((p, i) => (
                <div key={p.id} className={`relative flex flex-col rounded-3xl border p-6 ${i === plans.length - 1 ? 'border-brand-500 shadow-lift' : 'border-slate-200'}`}>
                  {i === plans.length - 1 && <span className="badge absolute -top-3 left-6 bg-brand-600 text-white">Phổ biến</span>}
                  <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                  {p.description && <p className="text-sm text-slate-500">{p.description}</p>}
                  <div className="mt-4 text-3xl font-extrabold text-ink">{p.priceMonthly ? money(p.priceMonthly) : 'Miễn phí'}<span className="text-sm font-medium text-slate-400">{p.priceMonthly ? ' /tháng' : ''}</span></div>
                  <ul className="mt-5 space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{p.maxProducts ? `Tối đa ${p.maxProducts.toLocaleString('vi-VN')} sản phẩm` : 'Không giới hạn sản phẩm'}</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{p.maxStaff == null ? 'Không giới hạn nhân viên' : p.maxStaff ? `${p.maxStaff} tài khoản nhân viên` : 'Chỉ chủ cửa hàng'}</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />Website, POS, kho, báo cáo, app</li>
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="mt-10 text-center text-slate-600">
            Liên hệ quản trị nền tảng để được tạo cửa hàng và tài khoản quản lý{HOTLINE && <> – Hotline <a className="link" href={`tel:${HOTLINE}`}>{HOTLINE}</a></>}.
          </p>
        </div>
      </section>
    </>
  );
}
