/** Đọc số tiền bằng chữ tiếng Việt (dùng cho hoá đơn). Vd: 1.250.000 → "Một triệu hai trăm năm mươi nghìn đồng" */
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  const out: string[] = [];
  if (h > 0 || full) out.push(`${DIGITS[h]} trăm`);
  if (t > 1) {
    out.push(`${DIGITS[t]} mươi`);
    if (u === 1) out.push('mốt');
    else if (u === 4) out.push('tư');
    else if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  } else if (t === 1) {
    out.push('mười');
    if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  } else if (u > 0) {
    if (h > 0 || full) out.push('lẻ');
    out.push(DIGITS[u]);
  }
  return out.join(' ');
}

export function numberToVietnameseWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return 'Không đồng';
  const groups: number[] = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const full = i < groups.length - 1; // nhóm không phải nhóm cao nhất → đọc đủ "không trăm"
    parts.push(readTriple(groups[i], full) + UNITS[i]);
  }
  const s = parts.join(' ').replace(/\s+/g, ' ').trim();
  return (amount < 0 ? 'Âm ' : '') + s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
}
