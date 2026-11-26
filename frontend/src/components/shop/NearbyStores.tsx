'use client';
import { Clock, Crosshair, Loader2, LocateFixed, Map as MapIcon, MapPin, Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { MapView, type MapPoint } from '@/components/map/MapView';
import { Carousel } from '@/components/ui/Carousel';
import { api, imageUrl, qs } from '@/lib/api';
import { money } from '@/lib/format';
import { currentPosition, type LatLng } from '@/lib/geo';
import type { PublicStore } from '@/lib/types';

type NearbyStore = PublicStore & { lat: number; lng: number; distanceKm: number; etaMin: number; shippingFee: number; shippingMode?: 'DISTANCE' | 'FIXED'; outOfRange?: boolean; freeShippingThreshold: number };
type Result = { radius: number; items: NearbyStore[]; unpinned: number };

const RADII = [3, 5, 10, 20];
const KEY = 'nearby:pos';
const readPos = (): LatLng | null => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && typeof v.lat === 'number' && typeof v.lng === 'number' ? v : null; }
  catch { return null; }
};
const savePos = (p: LatLng | null) => { try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* trình duyệt chặn lưu trữ */ } };

/** Trang chủ sàn: định vị khách → cửa hàng quanh đây (gần nhất trước) */
export function NearbyStores() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(5);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => { const p = readPos(); if (p) setPos(p); }, []); // nhớ vị trí lần trước

  const load = useCallback(async (p: LatLng, r: number) => {
    setLoading(true);
    try { setRes(await api<Result>('/stores/nearby' + qs({ lat: p.lat, lng: p.lng, radius: r }))); }
    catch { setRes({ radius: r, items: [], unpinned: 0 }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (pos) load(pos, radius); }, [pos, radius, load]);

  const use = (p: LatLng) => { setPos(p); savePos(p); setError(''); setPicking(false); };
  const locate = async () => {
    setLocating(true); setError('');
    try { use(await currentPosition()); }
    catch (e) { setError((e as Error).message); setPicking(true); } // không định vị được → cho chọn trên bản đồ
    finally { setLocating(false); }
  };

  const items = res?.items ?? [];
  const points: MapPoint[] = [
    ...(pos ? [{ kind: 'home', ...pos, label: 'Vị trí của bạn' } as MapPoint] : []),
    ...items.map((s) => ({ kind: 'store', lat: s.lat, lng: s.lng, label: `${s.name} · ${s.distanceKm} km` }) as MapPoint),
  ];

  return (
    <section className="container-x pt-8" data-testid="nearby-stores">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2"><LocateFixed className="h-6 w-6 text-brand-600" />Cửa hàng quanh bạn</h2>
          <p className="mt-1 text-sm text-slate-500">{pos ? 'Sắp xếp từ gần đến xa – cửa hàng gần giao nhanh hơn, phí ship thấp hơn.' : 'Cho phép định vị để xem tạp hoá gần nhà bạn nhất.'}</p>
        </div>
        {pos && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Trong bán kính</span>
            {RADII.map((r) => <button key={r} className={`chip ${radius === r ? 'chip-active' : ''}`} onClick={() => setRadius(r)}>{r} km</button>)}
            <button className="btn-ghost btn-sm" onClick={() => setShowMap(!showMap)}><MapIcon className="h-4 w-4" />{showMap ? 'Ẩn bản đồ' : 'Bản đồ'}</button>
            <button className="btn-ghost btn-sm" onClick={locate} disabled={locating}><Crosshair className="h-4 w-4" />{locating ? 'Đang định vị…' : 'Định vị lại'}</button>
            <button className="btn-ghost btn-sm" onClick={() => setPicking(!picking)}><MapPin className="h-4 w-4" />Chọn trên bản đồ</button>
          </div>
        )}
      </div>

      {!pos && !picking && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-6 text-center sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"><LocateFixed className="h-6 w-6" /></span>
          <div className="flex-1">
            <div className="font-semibold text-ink">Tìm tạp hoá gần bạn</div>
            <div className="text-sm text-slate-500">Vị trí chỉ dùng để tính khoảng cách, không gửi cho cửa hàng.</div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={locate} disabled={locating} data-testid="nearby-locate">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}{locating ? 'Đang định vị…' : 'Dùng vị trí của tôi'}
            </button>
            <button className="btn-outline" onClick={() => setPicking(true)}><MapPin className="h-4 w-4" />Chọn trên bản đồ</button>
          </div>
        </div>
      )}

      {error && <p className="mb-2 text-sm text-amber-700">{error} – bạn có thể chạm lên bản đồ để chọn vị trí.</p>}
      {picking && (
        <div className="mb-4 space-y-2">
          <MapView points={pos ? [{ kind: 'home', ...pos }] : []} onPick={use} height={280} />
          <p className="text-xs text-slate-500">Chạm vào bản đồ tại nơi bạn muốn nhận hàng.</p>
        </div>
      )}

      {pos && (
        <div className={showMap ? 'grid gap-4 lg:grid-cols-[1fr_380px]' : ''}>
          <div className="min-w-0">
            {loading && !res ? (
              <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tìm cửa hàng gần bạn…</div>
            ) : items.length ? (
              <Carousel label="Cửa hàng quanh bạn">
                {items.map((s) => (
                  <Link key={s.id} href={`/s/${s.slug}`} className="group flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 transition hover:border-brand-300 hover:shadow-soft" data-testid="nearby-store">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {s.logo ? <img src={imageUrl(s.logo)} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink group-hover:text-brand-700">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.productCount} sản phẩm</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="badge bg-brand-50 text-brand-800"><MapPin className="h-3 w-3" />{s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm} km`}</span>
                      <span className="badge bg-sky-50 text-sky-800"><Clock className="h-3 w-3" />~{s.etaMin} phút</span>
                      {!s.acceptingOrders && <span className="badge bg-slate-100 text-slate-500">Tạm ngưng nhận đơn</span>}
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{s.outOfRange ? 'Ngoài vùng giao' : <>Ship {s.shippingFee ? `${s.shippingMode === 'DISTANCE' ? '~' : ''}${money(s.shippingFee)}` : 'miễn phí'}{s.shippingFee && s.freeShippingThreshold ? ` · freeship từ ${money(s.freeShippingThreshold)}` : ''}</>}</span>
                    </div>
                    {s.address && <div className="line-clamp-2 text-xs text-slate-400">{s.address}</div>}
                  </Link>
                ))}
              </Carousel>
            ) : (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-center text-sm text-slate-500">
                Chưa có cửa hàng nào trong bán kính {radius} km quanh bạn.
                {radius < RADII[RADII.length - 1] && <> <button className="font-semibold text-brand-700" onClick={() => setRadius(RADII[RADII.indexOf(radius) + 1])}>Mở rộng {RADII[RADII.indexOf(radius) + 1]} km</button> hoặc </>}
                {' '}<Link href="/stores" className="font-semibold text-brand-700">xem tất cả cửa hàng</Link>.
                {!!res?.unpinned && <div className="mt-1 text-xs text-slate-400">({res.unpinned} cửa hàng chưa ghim vị trí trên bản đồ nên chưa hiện ở đây)</div>}
              </div>
            )}
          </div>
          {showMap && <MapView points={points} height={300} />}
        </div>
      )}
    </section>
  );
}
