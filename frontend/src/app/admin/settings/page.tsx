'use client';
import { ArrowDown, ArrowUp, Banknote, CircleX, CreditCard, Image as ImageIcon, Plus, QrCode, Receipt, Save, Share2, Store, Trash2, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddressFields } from '@/components/AddressFields';
import { LocationPicker } from '@/components/LocationPicker';
import { type AddressParts, EMPTY_ADDRESS, isComplete, toParts, toPayload } from '@/lib/vn-address';
import type { LatLng } from '@/lib/geo';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/ui';
import { useSettings } from '@/context/settings';
import { api } from '@/lib/api';
import { money, vietQrUrl } from '@/lib/format';
import type { StoreSettings } from '@/lib/types';
import { REDUCED_VAT_UNTIL, TAX_METHODS, VAT_OPTIONS } from '@/lib/vat';

const BANKS: [string, string][] = [
  ['970436', 'Vietcombank'], ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970407', 'Techcombank'],
  ['970422', 'MB Bank'], ['970416', 'ACB'], ['970432', 'VPBank'], ['970423', 'TPBank'], ['970403', 'Sacombank'], ['970441', 'VIB'],
  ['970443', 'SHB'], ['970437', 'HDBank'], ['970448', 'OCB'], ['970426', 'MSB'], ['970440', 'SeABank'], ['970431', 'Eximbank'],
  ['970449', 'LPBank'], ['970428', 'Nam A Bank'],
];

type AdminSettings = StoreSettings & { location?: { lat: number | null; lng: number | null }; addressParts?: Partial<AddressParts> | null };

const TABS = [
  { k: 'store', label: 'Cửa hàng', icon: Store },
  { k: 'invoice', label: 'Thuế & hoá đơn', icon: Receipt },
  { k: 'shipping', label: 'Giao hàng', icon: Truck },
  { k: 'payment', label: 'Thanh toán', icon: CreditCard },
  { k: 'banners', label: 'Banner trang chủ', icon: ImageIcon },
  { k: 'social', label: 'Mạng xã hội', icon: Share2 },
] as const;

function Toggle({ checked, onChange, label, sub, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub: string; icon: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
      <span className="flex-1"><span className="block font-semibold text-ink">{label}</span><span className="text-sm text-slate-500">{sub}</span></span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { reload } = useSettings();
  const [s, setS] = useState<AdminSettings | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['k']>('store');
  const [saving, setSaving] = useState(false);
  const [slot, setSlot] = useState('');

  const [loc, setLoc] = useState<LatLng | null>(null);
  const [addr, setAddr] = useState<AddressParts>(EMPTY_ADDRESS);
  const [savingAddr, setSavingAddr] = useState(false);
  useEffect(() => {
    api<AdminSettings>('/admin/settings').then((r) => {
      setS(r);
      setAddr(toParts(r.addressParts));
      if (r.location?.lat != null && r.location?.lng != null) setLoc({ lat: r.location.lat, lng: r.location.lng });
    });
  }, []);
  const saveLoc = async (v: LatLng | null) => {
    setLoc(v);
    try { await api('/admin/settings/location', { method: 'PUT', json: { lat: v?.lat ?? null, lng: v?.lng ?? null } }); toast(v ? 'Đã lưu vị trí cửa hàng' : 'Đã bỏ vị trí cửa hàng'); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const saveAddr = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try { const r = await api<AdminSettings>('/admin/settings/address', { method: 'PUT', json: toPayload(addr) }); setS(r); setAddr(toParts(r.addressParts)); reload(); toast('Đã lưu địa chỉ cửa hàng'); }
    catch (err: any) { toast(err.message, 'error'); } finally { setSavingAddr(false); }
  };
  if (!s) return <Spinner />;
  const up = (patch: Partial<StoreSettings>) => setS({ ...s, ...patch });
  const field = (k: keyof StoreSettings, label: string, opts: { type?: string; textarea?: boolean; hint?: string } = {}) => (
    <div>
      <label className="label">{label}</label>
      {opts.textarea
        ? <textarea className="input" rows={2} value={String(s[k] ?? '')} onChange={(e) => up({ [k]: e.target.value } as any)} />
        : <input className="input" type={opts.type ?? 'text'} value={String(s[k] ?? '')} onChange={(e) => up({ [k]: opts.type === 'number' ? Number(e.target.value) : e.target.value } as any)} />}
      {opts.hint && <p className="mt-1 text-xs text-slate-400">{opts.hint}</p>}
    </div>
  );

  const save = async () => {
    setSaving(true);
    try { const { vnpayConfigured, location, addressParts, address, ...body } = s; setS(await api<AdminSettings>('/admin/settings', { method: 'PUT', json: body })); reload(); toast('Đã lưu cài đặt'); }
    catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const moveBanner = (i: number, d: number) => { const b = [...s.banners]; [b[i], b[i + d]] = [b[i + d], b[i]]; up({ banners: b }); };

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <nav className="card h-fit p-2 lg:sticky lg:top-20">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === t.k ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50'}`}><t.icon className="h-4 w-4" />{t.label}</button>
        ))}
      </nav>
      <div className="space-y-5">
        <div className="card space-y-4">
          {tab === 'store' && (
            <>
              <h2 className="text-lg font-bold">Thông tin cửa hàng</h2>
              <div className="grid gap-4 sm:grid-cols-2">{field('storeName', 'Tên cửa hàng')}{field('slogan', 'Slogan')}</div>
              <div><label className="label">Logo</label><ImageUploader value={s.logo ? [s.logo] : []} onChange={(v) => up({ logo: v[0] ?? '' })} /><p className="mt-1 text-xs text-slate-400">Để trống sẽ dùng logo mặc định.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">{field('hotline', 'Hotline')}{field('email', 'Email', { type: 'email' })}</div>
              <form onSubmit={saveAddr} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <AddressFields label="Địa chỉ cửa hàng" testId="store-addr" value={addr} onChange={setAddr}
                  hint={!s.addressParts && s.address ? `Địa chỉ hiện tại chưa có Tỉnh/Huyện/Xã: ${s.address} – chọn lại đầy đủ để tài xế trong khu vực nhận đơn` : undefined} />
                <div className="flex justify-end"><button className="btn-outline btn-sm" disabled={savingAddr || !isComplete(addr)} data-testid="save-address"><Save className="h-4 w-4" />{savingAddr ? 'Đang lưu…' : 'Lưu địa chỉ'}</button></div>
              </form>
              <LocationPicker kind="store" value={loc} onChange={saveLoc} address={addr} title="Vị trí cửa hàng (điểm tài xế đến lấy hàng)" hint="Dùng để tài xế của sàn tìm đường, tính quãng đường giao và hiển thị trên bản đồ theo dõi đơn. Lưu ngay khi chọn." />
              {field('openingHours', 'Giờ mở cửa')}
              {field('announcement', 'Thanh thông báo đầu trang', { hint: 'Hiển thị trên cùng mọi trang. Để trống để ẩn.' })}
            </>
          )}
          {tab === 'invoice' && (
            <>
              <h2 className="text-lg font-bold">Thuế & hoá đơn</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('taxCode', 'Mã số thuế của cửa hàng', { hint: 'Doanh nghiệp: 10 số. Hộ kinh doanh: số định danh cá nhân 12 số của chủ hộ (từ 01/07/2025).' })}
                <div>
                  <label className="label">Phương pháp tính thuế GTGT</label>
                  <select className="input" value={s.tax.method} onChange={(e) => up({ tax: { ...s.tax, method: e.target.value as StoreSettings['tax']['method'] } })}>
                    {Object.entries(TAX_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500"><b>{TAX_METHODS[s.tax.method].invoice}.</b> {TAX_METHODS[s.tax.method].hint}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Thuế suất GTGT mặc định của sản phẩm</label>
                  <select className="input" value={s.tax.defaultVatRate} onChange={(e) => up({ tax: { ...s.tax, defaultVatRate: e.target.value } })}>
                    {VAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Áp dụng cho sản phẩm chưa khai báo thuế suất riêng. Mỗi mặt hàng nên khai báo đúng thuế suất trong form sản phẩm (rau củ tươi 5%, đồ uống có đường 10%…).</p>
                </div>
                {field('invoiceFooter', 'Lời cảm ơn / chính sách cuối phiếu', { textarea: true })}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <Toggle checked={s.einvoice.enabled} onChange={(v) => up({ einvoice: { ...s.einvoice, enabled: v } })} icon={<Receipt className="h-5 w-5" />}
                  label="Nhận yêu cầu xuất hoá đơn điện tử" sub="Khách nhập thông tin xuất hoá đơn khi đặt hàng / trong chi tiết đơn; cửa hàng phát hành trên phần mềm HĐĐT rồi nhập số hoá đơn để khách tra cứu" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><label className="label">Nhà cung cấp HĐĐT</label><input className="input" list="einv-providers" placeholder="VNPT, Viettel, MISA…" value={s.einvoice.provider} onChange={(e) => up({ einvoice: { ...s.einvoice, provider: e.target.value } })} />
                    <datalist id="einv-providers">{['VNPT Invoice', 'Viettel S-Invoice', 'MISA meInvoice', 'BKAV eHoadon', 'EasyInvoice', 'FPT eInvoice'].map((x) => <option key={x} value={x} />)}</datalist></div>
                  <div><label className="label">Ký hiệu hoá đơn đã đăng ký</label><input className="input font-mono uppercase" placeholder="C26MAA" maxLength={6} value={s.einvoice.series} onChange={(e) => up({ einvoice: { ...s.einvoice, series: e.target.value.toUpperCase() } })} />
                    <p className="mt-1 text-xs text-slate-400">Mẫu số {s.tax.method === 'KHAU_TRU' ? '1' : '2'} · C = có mã CQT, K = không mã · 26 = năm · M = khởi tạo từ máy tính tiền, T = đã đăng ký với CQT…</p></div>
                  <div><label className="label">Trang tra cứu hoá đơn</label><input className="input" placeholder="https://…" value={s.einvoice.lookupUrl} onChange={(e) => up({ einvoice: { ...s.einvoice, lookupUrl: e.target.value } })} /></div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Quy định cần tuân thủ</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Phiếu in từ hệ thống này là <b>phiếu thanh toán</b>, KHÔNG phải hoá đơn. Hoá đơn hợp lệ phải được lập, ký số và gửi cơ quan thuế qua phần mềm của tổ chức cung cấp dịch vụ HĐĐT (NĐ 123/2020, sửa đổi bởi NĐ 70/2025; TT 32/2025).</li>
                  <li>HKD / cá nhân kinh doanh có doanh thu từ 1 tỷ đồng/năm trở lên, bán lẻ trực tiếp cho người tiêu dùng: bắt buộc dùng <b>hoá đơn điện tử khởi tạo từ máy tính tiền</b> kết nối dữ liệu với cơ quan thuế.</li>
                  <li>Thời điểm lập hoá đơn bán hàng là thời điểm chuyển giao quyền sở hữu hàng hoá cho người mua, không phân biệt đã thu tiền hay chưa.</li>
                  <li>Mức 8% chỉ áp dụng đến hết {REDUCED_VAT_UNTIL.split('-').reverse().join('/')} – sau ngày này cần chuyển các sản phẩm 8% về 10% (trừ khi có văn bản gia hạn).</li>
                </ul>
              </div>
            </>
          )}
          {tab === 'shipping' && (
            <>
              <h2 className="text-lg font-bold">Giao hàng</h2>
              <div>
                <label className="label">Cách tính phí giao hàng</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([['DISTANCE', 'Theo quãng đường (khuyên dùng)', 'Tính theo km từ cửa hàng tới vị trí khách ghim, theo biểu phí chung của sàn. Khách bắt buộc ghim vị trí khi đặt hàng.'],
                    ['FIXED', 'Phí cố định', 'Mọi đơn cùng một mức phí, không phụ thuộc khoảng cách.']] as const).map(([k, t, d]) => (
                    <button type="button" key={k} onClick={() => up({ shippingMode: k })} className={`rounded-xl border p-3 text-left ${s.shippingMode === k ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 hover:border-brand-400'}`}>
                      <div className="font-semibold text-ink">{t}</div><div className="mt-0.5 text-xs text-slate-500">{d}</div>
                    </button>
                  ))}
                </div>
                {s.shippingMode === 'DISTANCE' && s.location?.lat == null && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Cửa hàng chưa ghim vị trí (tab Thông tin cửa hàng) – tạm thời vẫn tính phí cố định bên dưới.</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {field('shippingFee', s.shippingMode === 'DISTANCE' ? 'Phí cố định dự phòng (₫)' : 'Phí giao hàng (₫)', { type: 'number', ...(s.shippingMode === 'DISTANCE' && { hint: 'Dùng khi cửa hàng chưa ghim vị trí' }) })}
                {field('freeShippingThreshold', 'Miễn phí ship từ (₫)', { type: 'number', hint: '0 = luôn tính phí' })}
                {field('minOrderValue', 'Giá trị đơn tối thiểu (₫)', { type: 'number' })}
              </div>
              {field('deliveryDaysAhead', 'Cho phép đặt trước tối đa (ngày)', { type: 'number' })}
              <div>
                <label className="label">Khung giờ giao hàng</label>
                <div className="flex flex-wrap gap-2">
                  {s.deliverySlots.map((x) => <span key={x} className="chip">{x}<button onClick={() => up({ deliverySlots: s.deliverySlots.filter((y) => y !== x) })} className="text-slate-400 hover:text-red-500">×</button></span>)}
                </div>
                <div className="mt-2 flex gap-2"><input className="input max-w-xs" placeholder="VD: 19:00 – 21:00" value={slot} onChange={(e) => setSlot(e.target.value)} /><button className="btn-outline" onClick={() => { if (slot.trim()) { up({ deliverySlots: [...s.deliverySlots, slot.trim()] }); setSlot(''); } }}><Plus className="h-4 w-4" /> Thêm</button></div>
                <p className="mt-1 text-xs text-slate-400">Xoá hết khung giờ để tắt chọn giờ giao ở trang thanh toán.</p>
              </div>
            </>
          )}
          {tab === 'payment' && (
            <>
              <h2 className="text-lg font-bold">Phương thức thanh toán</h2>
              <Toggle checked={s.payment.cod} onChange={(v) => up({ payment: { ...s.payment, cod: v } })} label="Thanh toán khi nhận hàng (COD)" sub="Khách trả tiền mặt khi nhận hàng" icon={<Banknote className="h-5 w-5" />} />
              <Toggle checked={s.payment.bankTransfer} onChange={(v) => up({ payment: { ...s.payment, bankTransfer: v } })} label="Chuyển khoản VietQR" sub="Hiển thị mã QR có sẵn số tiền & nội dung" icon={<QrCode className="h-5 w-5" />} />
              {s.vnpayConfigured ? (
                <Toggle checked={s.payment.vnpay} onChange={(v) => up({ payment: { ...s.payment, vnpay: v } })} label="VNPay" sub="Thẻ ATM nội địa, Visa/Master, QR ngân hàng" icon={<CreditCard className="h-5 w-5" />} />
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <CircleX className="h-4 w-4 shrink-0" />
                  <span>Thanh toán online qua VNPay đang <b>tạm ngưng trên toàn sàn</b>. Khách thanh toán khi nhận hàng (COD) hoặc chuyển khoản VietQR thẳng vào tài khoản của cửa hàng bên dưới.</span>
                </div>
              )}
              <h3 className="pt-2 font-bold text-ink">Tài khoản nhận chuyển khoản</h3>
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div className="space-y-4">
                  <div><label className="label">Ngân hàng</label>
                    <select className="input" value={s.bank.bankBin} onChange={(e) => up({ bank: { ...s.bank, bankBin: e.target.value, bankName: BANKS.find((b) => b[0] === e.target.value)?.[1] ?? s.bank.bankName } })}>
                      {!BANKS.some((b) => b[0] === s.bank.bankBin) && <option value={s.bank.bankBin}>{s.bank.bankName} ({s.bank.bankBin})</option>}
                      {BANKS.map(([bin, name]) => <option key={bin} value={bin}>{name}</option>)}
                    </select></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="label">Số tài khoản</label><input className="input" value={s.bank.accountNo} onChange={(e) => up({ bank: { ...s.bank, accountNo: e.target.value.trim() } })} /></div>
                    <div><label className="label">Chủ tài khoản (không dấu)</label><input className="input uppercase" value={s.bank.accountName} onChange={(e) => up({ bank: { ...s.bank, accountName: e.target.value.toUpperCase() } })} /></div>
                  </div>
                </div>
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.bank.accountNo && <img src={vietQrUrl(s.bank, 10000, 'TEST')} alt="QR" className="mx-auto w-44 rounded-xl border" />}
                  <p className="mt-1 text-xs text-slate-400">Xem trước QR {money(10000)} – quét thử bằng app ngân hàng để kiểm tra đúng tài khoản</p>
                </div>
              </div>
            </>
          )}
          {tab === 'banners' && (
            <>
              <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Banner trang chủ</h2><button className="btn-outline" onClick={() => up({ banners: [...s.banners, { image: '', title: '', subtitle: '', buttonText: 'Mua ngay', link: '/products' }] })}><Plus className="h-4 w-4" /> Thêm banner</button></div>
              {s.banners.map((b, i) => (
                <div key={i} className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[240px_1fr]">
                  <ImageUploader value={b.image ? [b.image] : []} onChange={(v) => up({ banners: s.banners.map((x, j) => (j === i ? { ...x, image: v[0] ?? '' } : x)) })} />
                  <div className="space-y-3">
                    {(['title', 'subtitle', 'buttonText', 'link'] as const).map((k) => (
                      <input key={k} className="input" placeholder={{ title: 'Tiêu đề', subtitle: 'Mô tả ngắn', buttonText: 'Chữ trên nút', link: 'Đường dẫn (vd /products?category=...)' }[k]} value={b[k] ?? ''} onChange={(e) => up({ banners: s.banners.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)) })} />
                    ))}
                    <div className="flex gap-1">
                      <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => moveBanner(i, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button className="btn-ghost btn-sm" disabled={i === s.banners.length - 1} onClick={() => moveBanner(i, 1)}><ArrowDown className="h-4 w-4" /></button>
                      <button className="btn-ghost btn-sm ml-auto text-red-600" onClick={() => up({ banners: s.banners.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /> Xoá</button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400">Ảnh ngang tỉ lệ 21:9 (vd 1600×686) hiển thị đẹp nhất. Banner thứ 2 cũng được dùng làm khối quảng cáo giữa trang.</p>
            </>
          )}
          {tab === 'social' && (
            <>
              <h2 className="text-lg font-bold">Mạng xã hội</h2>
              {(['facebook', 'zalo', 'tiktok', 'youtube'] as const).map((k) => (
                <div key={k}><label className="label capitalize">{k}</label><input className="input" placeholder="https://..." value={s.social[k]} onChange={(e) => up({ social: { ...s.social, [k]: e.target.value } })} /></div>
              ))}
            </>
          )}
        </div>
        <div className="sticky bottom-4 flex justify-end"><button className="btn-primary btn-lg shadow-lift" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu cài đặt'}</button></div>
      </div>
    </div>
  );
}
