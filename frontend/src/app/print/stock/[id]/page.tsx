'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PrintShell } from '@/components/PrintShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useSettings } from '@/context/settings';
import { api } from '@/lib/api';
import { dateOnly, EXPORT_REASONS, num } from '@/lib/format';
import { numberToVietnameseWords } from '@/lib/number-to-words';
import type { StockDoc } from '@/lib/types';

const TITLE = { IMPORT: 'PHIẾU NHẬP KHO', EXPORT: 'PHIẾU XUẤT KHO', STOCKTAKE: 'BIÊN BẢN KIỂM KÊ HÀNG HOÁ' };
const FORM = { IMPORT: 'Mẫu số 01 - VT', EXPORT: 'Mẫu số 02 - VT', STOCKTAKE: 'Mẫu số 05 - VT' };
const STATUS = { DRAFT: '(NHÁP – chưa ghi sổ)', COMPLETED: '', CANCELLED: '(ĐÃ HUỶ)' };

export default function StockDocPrint() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, loading } = useAuth();
  const { settings: s, loaded } = useSettings();
  const [d, setD] = useState<StockDoc | null>(null);
  useEffect(() => { if (!loading && isStaff) api<StockDoc>(`/admin/stock/documents/${id}`).then(setD); }, [id, isStaff, loading]);
  if (!loading && !isStaff) return <div className="p-10 text-center">Không có quyền truy cập</div>;
  if (!d || !loaded) return <Spinner />;

  const date = new Date(d.completedAt ?? d.createdAt);
  const tk = d.type === 'STOCKTAKE';
  const cell = '[&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1';
  const signers = d.type === 'IMPORT' ? ['Người lập phiếu', 'Người giao hàng', 'Thủ kho', 'Kế toán trưởng'] : d.type === 'EXPORT' ? ['Người lập phiếu', 'Người nhận hàng', 'Thủ kho', 'Kế toán trưởng'] : ['Người kiểm kê', 'Thủ kho', 'Kế toán', 'Quản lý cửa hàng'];

  return (
    <PrintShell ready width="210mm" page="size: A4; margin: 0;">
      <div className="p-[14mm] text-[12.5px] leading-relaxed">
        <div className="flex justify-between">
          <div><b className="uppercase">{s.storeName}</b><div>{s.address}</div>{s.taxCode && <div>MST: {s.taxCode}</div>}</div>
          <div className="text-center text-[11.5px]"><b>{FORM[d.type]}</b><div className="italic">(Ban hành theo TT 200/2014/TT-BTC)</div></div>
        </div>
        <div className="my-5 text-center">
          <div className="text-2xl font-extrabold">{TITLE[d.type]} <span className="text-base text-red-600">{STATUS[d.status]}</span></div>
          <div className="italic">Ngày {String(date.getDate()).padStart(2, '0')} tháng {String(date.getMonth() + 1).padStart(2, '0')} năm {date.getFullYear()}</div>
          <div>Số: <b>{d.code}</b></div>
        </div>
        <div className="mb-3 space-y-0.5">
          {d.type === 'IMPORT' && <div>- Họ tên người giao / Nhà cung cấp: <b>{d.supplier?.name ?? '................................'}</b>{d.supplier?.taxCode && ` (MST ${d.supplier.taxCode})`}</div>}
          {d.type === 'IMPORT' && <div>- Theo hoá đơn số: {d.invoiceNo || '..........'}</div>}
          {d.type === 'EXPORT' && <div>- Lý do xuất kho: <b>{d.reason ? EXPORT_REASONS[d.reason] : ''}</b>{d.supplier && ` – Trả cho: ${d.supplier.name}`}</div>}
          {tk && <div>- Thời điểm kiểm kê: {date.toLocaleString('vi-VN')}</div>}
          <div>- Kho: Kho cửa hàng {s.storeName}</div>
          {d.note && <div>- Ghi chú: {d.note}</div>}
        </div>
        <table className={`w-full border-collapse ${cell}`}>
          <thead className="bg-slate-100">
            {tk ? (
              <tr><th>STT</th><th className="text-left">Tên hàng hoá</th><th>Mã số</th><th>ĐVT</th><th>Đơn giá vốn</th><th>SL sổ sách</th><th>SL thực tế</th><th>Chênh lệch</th><th>Giá trị lệch</th></tr>
            ) : (
              <tr><th className="w-10">STT</th><th className="text-left">Tên hàng hoá</th><th>Mã số</th><th>ĐVT</th>{d.type === 'IMPORT' && <th>Lô / HSD</th>}<th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
            )}
          </thead>
          <tbody>
            {d.items?.map((i, idx) => {
              const diff = i.quantity - (i.systemQty ?? i.variant.stock);
              return tk ? (
                <tr key={i.id}><td className="text-center">{idx + 1}</td><td>{i.variant.product.name} – {i.variant.name}</td><td className="font-mono text-[11px]">{i.variant.sku}</td><td className="text-center">{i.variant.product.unit}</td><td className="text-right">{num(i.unitCost || i.variant.costPrice || 0)}</td><td className="text-center">{i.systemQty ?? i.variant.stock}</td><td className="text-center">{i.quantity}</td><td className="text-center font-bold">{diff > 0 ? '+' : ''}{diff}</td><td className="text-right">{num(i.total)}</td></tr>
              ) : (
                <tr key={i.id}><td className="text-center">{idx + 1}</td><td>{i.variant.product.name} – {i.variant.name}</td><td className="font-mono text-[11px]">{i.variant.sku}</td><td className="text-center">{i.variant.product.unit}</td>{d.type === 'IMPORT' && <td className="text-[11px]">{i.lotNo}{i.expiryDate && ` ${dateOnly(i.expiryDate)}`}</td>}<td className="text-center">{i.quantity}</td><td className="text-right">{num(i.unitCost)}</td><td className="text-right">{num(i.total)}</td></tr>
              );
            })}
            <tr className="font-bold">
              <td colSpan={tk ? 7 : d.type === 'IMPORT' ? 5 : 4} className="text-right">Cộng</td>
              <td className="text-center">{tk ? `${d.totalQuantity > 0 ? '+' : ''}${d.totalQuantity}` : d.totalQuantity}</td>
              {!tk && <td />}
              <td className="text-right">{num(d.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2">- Tổng số tiền (viết bằng chữ): <b className="italic">{numberToVietnameseWords(d.totalAmount)}.</b></p>
        {d.status === 'CANCELLED' && <p className="font-bold text-red-600">Phiếu đã huỷ: {d.cancelReason}</p>}
        <div className="mt-8 grid grid-cols-4 text-center">
          {signers.map((x, i) => (
            <div key={x}><b>{x}</b><div className="text-[11px] italic">(Ký, họ tên)</div><div className="h-20" />{i === 0 && d.createdBy?.fullName}</div>
          ))}
        </div>
      </div>
    </PrintShell>
  );
}
