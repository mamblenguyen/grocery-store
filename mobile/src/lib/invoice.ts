import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { money, PAYMENT_METHOD } from './format';
import { numberToVietnameseWords } from './number-to-words';
import type { Order, StoreSettings } from './types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const PAY: Record<string, string> = { PAID: 'ĐÃ THANH TOÁN', UNPAID: 'CHƯA THANH TOÁN', REFUNDED: 'ĐÃ HOÀN TIỀN' };

/** HTML hoá đơn – khổ K80 (máy in nhiệt) hoặc A4 */
export function invoiceHtml(o: Order, s: StoreSettings, format: 'k80' | 'a4' = 'k80') {
  const vat = s.vatRate ? Math.round(o.total - (o.total * 100) / (100 + s.vatRate)) : 0;
  const d = new Date(o.createdAt).toLocaleString('vi-VN');
  const rows = (o.items ?? []).map((i, idx) => format === 'k80'
    ? `<div>${esc(i.productName)}${i.variantName !== 'Mặc định' ? ` (${esc(i.variantName)})` : ''}</div><div class="r"><span>${i.quantity} x ${i.price.toLocaleString('vi-VN')}</span><span>${i.total.toLocaleString('vi-VN')}</span></div>`
    : `<tr><td>${idx + 1}</td><td>${esc(i.productName)}<br/><small>${esc(i.variantName)}</small></td><td>${esc(i.sku)}</td><td class="c">${i.quantity}</td><td class="n">${i.price.toLocaleString('vi-VN')}</td><td class="n">${i.total.toLocaleString('vi-VN')}</td></tr>`).join('');
  const line = (l: string, v: string, b = false) => `<div class="r${b ? ' b' : ''}"><span>${l}</span><span>${v}</span></div>`;
  const totals = [
    line('Tiền hàng', money(o.subtotal)),
    o.discount ? line('Giảm giá', '-' + money(o.discount)) : '',
    o.shippingFee ? line('Phí giao hàng', money(o.shippingFee)) : '',
    line('TỔNG CỘNG', money(o.total), true),
    vat ? line(`(Đã gồm VAT ${s.vatRate}%)`, money(vat)) : '',
    o.cashReceived != null ? line('Khách đưa', money(o.cashReceived)) + line('Tiền thối', money(o.cashReceived - o.total), true) : '',
  ].join('');
  const head = `<div class="c"><h2>${esc(s.storeName)}</h2>${s.address ? `<div>${esc(s.address)}</div>` : ''}${s.hotline ? `<div>ĐT: ${esc(s.hotline)}</div>` : ''}${s.taxCode ? `<div>MST: ${esc(s.taxCode)}</div>` : ''}</div>`;
  const css = format === 'k80'
    ? `@page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto;padding:4mm 0;font:12px monospace}h2{margin:0 0 2px;font-size:15px}.c{text-align:center}.r{display:flex;justify-content:space-between}.b{font-weight:bold;font-size:14px}hr{border:0;border-top:1px dashed #000;margin:6px 0}`
    : `@page{size:A4;margin:14mm}body{font:13px sans-serif}h2{margin:0;font-size:18px}.c{text-align:center}.r{display:flex;justify-content:space-between;max-width:320px;margin-left:auto}.b{font-weight:bold;font-size:15px}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #000;padding:5px}.n{text-align:right}hr{border:0;border-top:1px solid #000}`;
  const body = format === 'k80'
    ? `${head}<hr/><div class="c b">HOÁ ĐƠN BÁN LẺ</div><div>Số: ${o.code}</div><div>${d}</div><div>KH: ${esc(o.customerName)}${o.phone ? ' - ' + esc(o.phone) : ''}</div><hr/>${rows}<hr/>${totals}<div>TT: ${PAYMENT_METHOD[o.paymentMethod] ?? o.paymentMethod} – ${PAY[o.paymentStatus]}</div><hr/><div class="c">${esc(s.invoiceFooter || 'Cảm ơn quý khách!')}</div>`
    : `${head}<hr/><h2 class="c" style="margin-top:12px">HOÁ ĐƠN BÁN HÀNG</h2><div class="c">Số: <b>${o.code}</b> · ${d}</div><p>Khách hàng: <b>${esc(o.customerName)}</b> · ${esc(o.phone)}<br/>Địa chỉ: ${esc(o.address)}<br/>Thanh toán: ${PAYMENT_METHOD[o.paymentMethod] ?? o.paymentMethod} – <b>${PAY[o.paymentStatus]}</b></p><table><tr><th>STT</th><th>Tên hàng</th><th>Mã</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>${rows}</table>${totals}<p>Bằng chữ: <i><b>${numberToVietnameseWords(o.total)}.</b></i></p><p class="c"><i>${esc(s.invoiceFooter)}</i></p>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>${body}</body></html>`;
}

/** In hoá đơn: mở hộp thoại in của hệ điều hành (AirPrint / Android Print, máy in Wi-Fi/Bluetooth hỗ trợ) */
export async function printInvoice(o: Order, s: StoreSettings, format: 'k80' | 'a4' = 'k80') {
  const html = invoiceHtml(o, s, format);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    return;
  }
  await Print.printAsync({ html, ...(format === 'k80' ? { width: 226 } : {}) });
}
