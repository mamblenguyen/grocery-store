import { Logger } from '@nestjs/common';

/**
 * Gợi ý toạ độ từ địa chỉ hành chính (OpenStreetMap qua Photon – https://photon.komoot.io).
 *
 * Danh mục Tỉnh/Huyện/Xã của hệ thống là bộ cũ (trước sắp xếp 2025); trên OSM các đơn vị cũ vẫn còn
 * dưới dạng ranh giới "historic". Tìm tự do theo tên phường hay số nhà dễ ra nhầm nơi cùng tên ở tỉnh khác,
 * nên làm theo 2 bước:
 *   1. Neo: tìm ranh giới Quận/Huyện (hoặc Tỉnh) có tên khớp chính xác → lấy khung bao.
 *   2. Tìm số nhà / tên đường, rồi tới Phường/Xã CHỈ trong khung đó, và tên kết quả phải khớp.
 * Không tìm được mức chi tiết thì trả về tâm Quận/Huyện (precision cho biết độ chính xác).
 */

export type GeoPrecision = 'house' | 'street' | 'ward' | 'district' | 'province';
export interface GeocodeResult { lat: number; lng: number; precision: GeoPrecision; label: string }
export interface GeocodeInput { provinceName: string; districtName?: string | null; wardName?: string | null; street?: string | null }

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; street?: string; housenumber?: string; extent?: [number, number, number, number]; osm_key?: string; osm_value?: string };
};
type Box = [number, number, number, number]; // minLon, minLat, maxLon, maxLat

const PHOTON = process.env.GEOCODER_URL || 'https://photon.komoot.io/api/';
const UA = 'GroceryStore/1.0 (store location helper)';
const log = new Logger('Geocode');

/** bỏ dấu, chữ thường, gộp khoảng trắng */
export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const PREFIX = /^(thanh pho|tinh|quan|huyen|thi xa|thi tran|phuong|xa)\s+/;
/** "Thị xã Bình Minh" → "binh minh"; "Quận 3" giữ nguyên "quan 3" (tên chỉ là số) */
export const core = (name: string) => { const n = norm(name); const s = n.replace(PREFIX, ''); return /^\d+$/.test(s) ? n : s; };
/** Bỏ tiền tố hành chính nhưng giữ dấu: "Tỉnh Vĩnh Long" → "Vĩnh Long" */
const bare = (name: string) => { const m = name.match(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Thị trấn|Phường|Xã)\s+(.+)$/i); return m && !/^\d+$/.test(m[2]) ? m[2] : name; };

/**
 * Tách "212 Cách Mạng Tháng Tám" → { number: '212', name: 'Cách Mạng Tháng Tám' }.
 * "số 1 tổ 6", "ấp Mỹ Hòa" → name rỗng / locality (không phải tên đường).
 */
export function splitStreet(street: string) {
  let s = street.trim().replace(/^(số|so|sn)\s*/i, '');
  const num = s.match(/^([0-9]+[a-z]?(?:\/[0-9a-z]+)*)[\s,]+/i);
  if (num) s = s.slice(num[0].length);
  s = s.replace(/^(đường|duong|đ\.)\s+/i, '').trim();
  const locality = /^(tổ|to|ấp|ap|khóm|khom|thôn|thon|xóm|xom|khu phố|khu pho|kp|bản|ban)(?=[\s.,]|$)/i.test(s);
  return { number: num?.[1] ?? null, name: locality ? '' : s, locality: locality ? s : '' };
}

// ───────────── gọi Photon: tuần tự, giãn cách, có cache ─────────────
const cache = new Map<string, { at: number; v: GeocodeResult | null }>();
const TTL = 7 * 24 * 3600 * 1000;
let chain: Promise<unknown> = Promise.resolve();
let last = 0;

async function photon(q: string, opts: { box?: Box; tags?: string[]; limit?: number } = {}): Promise<Feature[]> {
  const url = new URL(PHOTON);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(opts.limit ?? 5));
  if (opts.box) url.searchParams.set('bbox', opts.box.join(','));
  for (const t of opts.tags ?? []) url.searchParams.append('osm_tag', t);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      const wait = last + 600 - Date.now(); // dịch vụ miễn phí: ~1–2 yêu cầu/giây
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if ((r.status === 429 || r.status === 503) && attempt < 2) { await sleep(1500 * (attempt + 1)); continue; }
      if (!r.ok) throw new Error(`Photon HTTP ${r.status}`);
      return ((await r.json()) as { features?: Feature[] }).features ?? [];
    }
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

const point = (f: Feature) => ({ lat: round(f.geometry.coordinates[1]), lng: round(f.geometry.coordinates[0]) });
const round = (n: number) => Math.round(n * 1e6) / 1e6;
const inBox = (f: Feature, b: Box) => { const [x, y] = f.geometry.coordinates; return x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]; };
/** extent của Photon: [minLon, maxLat, maxLon, minLat] */
const boxOf = (f: Feature, pad: number): Box => {
  const e = f.properties.extent;
  if (e) return [e[0] - pad, e[3] - pad, e[2] + pad, e[1] + pad];
  const { lat, lng } = point(f);
  return [lng - pad * 4, lat - pad * 4, lng + pad * 4, lat + pad * 4];
};

/** Tìm ranh giới hành chính có tên khớp chính xác */
async function findUnit(name: string, context: string, box?: Box) {
  const feats = await photon([name, context].filter(Boolean).join(', '), { tags: ['boundary', 'place'], box, limit: 8 });
  const want = core(name);
  return feats.find((f) => f.properties.name && core(f.properties.name) === want && (!box || inBox(f, box)));
}

export async function geocode(input: GeocodeInput): Promise<GeocodeResult | null> {
  const key = norm([input.street, input.wardName, input.districtName, input.provinceName].filter(Boolean).join('|'));
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  let v: GeocodeResult | null = null;
  try { v = await resolve(input); }
  catch (e) { log.warn(`Không tra được toạ độ "${key}": ${(e as Error).message}`); return null; } // lỗi mạng: không cache
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), v });
  return v;
}

async function resolve({ provinceName, districtName, wardName, street }: GeocodeInput): Promise<GeocodeResult | null> {
  const province = bare(provinceName);
  // 1. Neo theo Quận/Huyện, không có thì theo Tỉnh
  const district = districtName ? await findUnit(districtName, province) : undefined;
  const anchor = district ?? (await findUnit(provinceName, ''));
  if (!anchor) return null;
  const box = boxOf(anchor, district ? 0.01 : 0.05);
  const fallback: GeocodeResult = { ...point(anchor), precision: district ? 'district' : 'province', label: district ? districtName! : provinceName };
  if (!district) return fallback; // không neo được huyện → tìm chi tiết dễ sai, dừng ở mức tỉnh

  // 2. Số nhà / tên đường trong khung Quận/Huyện
  const s = street ? splitStreet(street) : null;
  if (s?.name && core(s.name).length >= 3) {
    const feats = await photon([s.number, s.name, bare(districtName!), province].filter(Boolean).join(' '), { box, limit: 10 });
    const want = core(s.name);
    const onStreet = feats.filter((f) => inBox(f, box) && [f.properties.street, f.properties.name].some((x) => x && core(x).includes(want)));
    const house = s.number ? onStreet.find((f) => f.properties.housenumber && norm(f.properties.housenumber) === norm(s.number!)) : undefined;
    if (house) return { ...point(house), precision: 'house', label: `${s.number} ${s.name}` };
    const road = onStreet.find((f) => f.properties.osm_key === 'highway') ?? onStreet[0];
    if (road) return { ...point(road), precision: 'street', label: s.name };
  }
  // 3. Ấp/khóm/thôn ghi trong số nhà, rồi tới Phường/Xã – trong khung Quận/Huyện, tên phải khớp
  if (s?.locality) {
    const loc = await findUnit(s.locality, bare(districtName!), box);
    if (loc) return { ...point(loc), precision: 'ward', label: s.locality };
  }
  if (wardName) {
    const ward = await findUnit(wardName, bare(districtName!), box) ?? await findUnit(bare(wardName), '', box);
    if (ward) return { ...point(ward), precision: 'ward', label: wardName };
  }
  return fallback;
}
