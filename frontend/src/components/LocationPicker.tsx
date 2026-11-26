'use client';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MapView, type MapPoint } from '@/components/map/MapView';
import { useToast } from '@/components/Toast';
import { currentPosition, distanceKm, type LatLng } from '@/lib/geo';
import { type AddressParts, geocodeAddress, type GeoSuggestion, PRECISION_LABEL, PRECISION_ZOOM } from '@/lib/vn-address';

/**
 * Ghim vị trí: lấy GPS hiện tại hoặc chạm lên bản đồ để chỉnh.
 * Truyền `address` → tự tìm toạ độ của địa chỉ, đưa bản đồ tới đúng khu vực và gợi ý điểm ghim.
 */
export function LocationPicker({ value, onChange, title = 'Ghim vị trí trên bản đồ', hint, kind = 'home', address }: {
  value: LatLng | null; onChange: (v: LatLng | null) => void; title?: string; hint?: string; kind?: 'home' | 'store';
  address?: AddressParts;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(!!value);
  const [busy, setBusy] = useState(false);
  const [suggest, setSuggest] = useState<GeoSuggestion | null>(null);
  const [finding, setFinding] = useState(false);
  /** đã có điểm ghim lúc mở trang → lần gợi ý đầu không kéo bản đồ đi chỗ khác */
  const keepView = useRef(!!value);

  const addrKey = address ? JSON.stringify([address.provinceCode, address.districtCode, address.wardCode, address.street.trim()]) : '';
  const prevAddr = useRef(addrKey);
  useEffect(() => {
    if (prevAddr.current !== addrKey) keepView.current = false; // người dùng đổi địa chỉ → cho bản đồ tới khu vực mới
    prevAddr.current = addrKey;
    if (!address || address.provinceCode == null) { setSuggest(null); return; }
    let alive = true;
    setFinding(true);
    // chờ người dùng gõ xong số nhà/tên đường
    const t = setTimeout(async () => {
      const r = await geocodeAddress(address);
      if (!alive) return;
      setFinding(false);
      setSuggest(r);
      if (r) setOpen(true);
    }, 700);
    return () => { alive = false; clearTimeout(t); setFinding(false); };
  }, [addrKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    setBusy(true);
    try { onChange(await currentPosition()); setOpen(true); }
    catch (e: any) { toast(e.message, 'error'); setOpen(true); }
    finally { setBusy(false); }
  };
  const pick = (v: LatLng | null) => { keepView.current = false; onChange(v); };

  const gap = value && suggest ? distanceKm(value, suggest) : null;
  // Điểm gợi ý: ẩn khi trùng điểm đã ghim; giữ khung nhìn quanh điểm ghim ở lần mở trang đầu tiên
  const showSuggest = !!suggest && (gap == null || gap > 0.05) && !(keepView.current && value);
  const points: MapPoint[] = [
    ...(value ? [{ kind, ...value } as MapPoint] : []),
    ...(showSuggest ? [{ kind: 'suggest', lat: suggest!.lat, lng: suggest!.lng } as MapPoint] : []),
  ];
  const roughOnly = suggest && (suggest.precision === 'district' || suggest.precision === 'province');

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-rose-600" />{title}
          {value && <span className="badge bg-green-100 text-green-800">Đã ghim</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={locate} disabled={busy} data-testid="use-my-location"><Crosshair className="h-4 w-4" />{busy ? 'Đang định vị…' : 'Vị trí hiện tại'}</button>
          {!open && <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>Chọn trên bản đồ</button>}
          {value && <button type="button" className="btn-ghost btn-sm text-slate-400" onClick={() => pick(null)} aria-label="Bỏ ghim"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}

      {address && (finding || suggest || address.provinceCode != null) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="geo-suggest">
          {finding ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tìm địa chỉ trên bản đồ…</>
          ) : suggest ? (
            <>
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">
                Đã tìm thấy <b>{suggest.label}</b> ({PRECISION_LABEL[suggest.precision]}).{' '}
                {roughOnly ? 'Chỉ xác định được khu vực – phóng to và chạm đúng chỗ để ghim.' : 'Kiểm tra lại rồi chạm đúng chỗ trên bản đồ, hoặc ghim luôn tại điểm gợi ý.'}
                {gap != null && gap > 1 && <b className="text-red-700"> Điểm đang ghim cách địa chỉ khoảng {gap.toFixed(1)} km – kiểm tra lại.</b>}
              </span>
              {showSuggest && !roughOnly && (
                <button type="button" className="btn-outline btn-sm bg-white" onClick={() => pick({ lat: suggest.lat, lng: suggest.lng })} data-testid="pin-suggestion">
                  <MapPin className="h-4 w-4" />Ghim tại điểm gợi ý
                </button>
              )}
              {!showSuggest && keepView.current && value && gap != null && gap > 0.05 && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => { keepView.current = false; setSuggest({ ...suggest }); }}>Xem trên bản đồ</button>
              )}
            </>
          ) : (
            <>Chưa tìm thấy địa chỉ này trên bản đồ – dùng “Vị trí hiện tại” hoặc kéo bản đồ tới nơi và chạm để ghim.</>
          )}
        </div>
      )}

      {open && (
        <>
          <MapView points={points} onPick={pick} height={260}
            zoom={!value && suggest ? PRECISION_ZOOM[suggest.precision] : undefined} />
          <p className="text-xs text-slate-400">
            Chạm vào bản đồ để đặt đúng vị trí{value ? ` · ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : ''}
            {showSuggest && <> · <span className="text-amber-600">🔎 = điểm gợi ý từ địa chỉ</span></>}
          </p>
        </>
      )}
    </div>
  );
}
