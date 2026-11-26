'use client';
import { Download, FileText, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_URL, tokenStore } from '@/lib/api';
import { dateTime } from '@/lib/format';
import type { PartnerContract, PartnerDoc } from '@/lib/partner';

const money = (n: number) => `${n.toLocaleString('vi-VN')} đồng`;
const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '…');

/** Toàn văn hợp đồng (render từ snapshot đã băm SHA-256 – không sửa được sau khi gửi) */
export function ContractView({ c, hash, signed }: { c: PartnerContract; hash?: string | null; signed?: { name: string; at: string; ip?: string | null } | null }) {
  const A = c.partyA, B = c.partyB;
  const created = new Date(c.createdAt);
  return (
    <article className="contract space-y-4 text-[14px] leading-relaxed text-ink">
      <div className="text-center">
        <div className="font-bold">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div className="font-semibold">Độc lập – Tự do – Hạnh phúc</div>
        <div className="mx-auto mt-1 w-40 border-t border-ink" />
        <h2 className="mt-4 text-lg font-extrabold">{c.title}</h2>
        <div>Số: <b>{c.no}</b></div>
      </div>
      <ul className="list-none space-y-0.5 italic">{c.bases.map((b) => <li key={b}>– Căn cứ {b}</li>)}</ul>
      <p>Hôm nay, ngày {created.getDate()} tháng {created.getMonth() + 1} năm {created.getFullYear()}, chúng tôi gồm:</p>
      <section>
        <p className="font-bold">BÊN A (BÊN CUNG CẤP DỊCH VỤ): {A.name}</p>
        <p>Mã số thuế: {A.taxCode} · Địa chỉ: {A.address}</p>
        <p>Đại diện: {A.representative} – Chức vụ: {A.title}{A.phone && ` · Điện thoại: ${A.phone}`}{A.email && ` · Email: ${A.email}`}</p>
        {c.ecommerceRegistration && <p>Sàn TMĐT đã đăng ký với Bộ Công Thương: {c.ecommerceRegistration}</p>}
      </section>
      <section>
        <p className="font-bold">BÊN B (BÊN SỬ DỤNG DỊCH VỤ): {B.name} ({B.businessType})</p>
        <p>Mã số thuế: {B.taxCode} · Giấy CN đăng ký kinh doanh số {B.licenseNo}{B.licenseDate && ` cấp ngày ${d(B.licenseDate)}`}{B.licensePlace && ` tại ${B.licensePlace}`}</p>
        <p>Địa chỉ: {B.address}</p>
        <p>Đại diện: {B.representative} – {B.title} · CCCD số {B.idNumber} · Điện thoại: {B.phone} · Email: {B.email}</p>
        <p>Tài khoản: {B.bankAccountNo} tại {B.bankName} – Chủ TK: {B.bankAccountName}</p>
        <p>Gian hàng: <b>{B.storeName}</b> – {B.storeAddress}</p>
      </section>
      <p>Hai Bên thống nhất ký kết Hợp đồng với các điều khoản sau:</p>
      {c.articles.map((a) => (
        <section key={a.title}>
          <h3 className="font-bold">{a.title}</h3>
          <ol className="list-decimal space-y-1 pl-6">{a.items.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </section>
      ))}
      <section className="rounded-xl bg-slate-50 p-3 text-sm">
        <b>Tóm tắt thương mại:</b> gói {c.commercial.planName}{c.commercial.priceMonthly ? ` · ${money(c.commercial.priceMonthly)}/tháng × ${c.commercial.months} tháng` : ' · miễn phí, không thời hạn'}
        {c.commercial.addons?.map((l) => <span key={l.packId}> · {l.name}{l.units > 1 && ` × ${l.units}`} ({money(l.price)})</span>)}
        {' '}– tổng phí kỳ đầu <b>{money(c.commercial.amount)}</b>. {c.commercial.startRule}.
      </section>
      <div className="grid grid-cols-2 pt-4 text-center">
        <div><b>ĐẠI DIỆN BÊN A</b><div className="h-16" /><div>{A.representative}</div></div>
        <div>
          <b>ĐẠI DIỆN BÊN B</b>
          {signed ? <div className="mx-auto mt-2 w-fit rounded-lg border-2 border-emerald-600 px-3 py-1 text-sm text-emerald-700">Đã ký điện tử<br />{dateTime(signed.at)}{signed.ip && <><br />IP {signed.ip}</>}</div> : <div className="h-16" />}
          <div>{signed?.name ?? B.representative}</div>
        </div>
      </div>
      {hash && <p className="pt-2 text-center font-mono text-[11px] break-all text-slate-400">SHA-256: {hash}</p>}
    </article>
  );
}

/** Tải file giấy tờ riêng tư (API cần token) → object URL */
function useDocUrl(id: number) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let u = '';
    fetch(`${API_URL}/partner/documents/${id}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { u = URL.createObjectURL(b); setUrl(u); })
      .catch(() => setUrl(''));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

export function DocTile({ doc, label, onDelete }: { doc: PartnerDoc; label?: string; onDelete?: () => void }) {
  const url = useDocUrl(doc.id);
  const img = doc.mimeType.startsWith('image/');
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <a href={url || undefined} target="_blank" rel="noopener noreferrer" className="flex h-32 items-center justify-center bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && url ? <img src={url} alt={doc.fileName} className="h-full w-full object-contain" /> : <FileText className="h-10 w-10 text-slate-400" />}
      </a>
      <div className="flex items-start gap-2 p-2 text-xs">
        <div className="min-w-0 flex-1">
          {label && <div className="font-semibold text-ink">{label}</div>}
          <div className="truncate text-slate-500" title={doc.fileName}>{doc.fileName}</div>
          <div className="text-slate-400">{Math.round(doc.size / 1024)} KB</div>
        </div>
        {url && <a href={url} download={doc.fileName} className="rounded p-1 text-slate-400 hover:text-brand-700" title="Tải về"><Download className="h-4 w-4" /></a>}
        {onDelete && <button type="button" onClick={onDelete} className="rounded p-1 text-slate-400 hover:text-red-600" title="Xoá"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items?: { at: string; by: string; action: string; note?: string }[] | null }) {
  if (!items?.length) return null;
  return (
    <ol className="space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
      {[...items].reverse().map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-brand-500" />
          <div className="font-semibold text-ink">{h.action}</div>
          <div className="text-xs text-slate-400">{dateTime(h.at)} · {h.by}</div>
          {h.note && <div className="mt-0.5 text-slate-600">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}
