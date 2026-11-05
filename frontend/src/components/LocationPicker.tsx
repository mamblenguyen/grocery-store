'use client';
import { Crosshair, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { useToast } from '@/components/Toast';
import { currentPosition, type LatLng } from '@/lib/geo';

/** Ghim vị trí: lấy GPS hiện tại hoặc chạm lên bản đồ để chỉnh */
export function LocationPicker({ value, onChange, title = 'Ghim vị trí trên bản đồ', hint, kind = 'home' }: {
  value: LatLng | null; onChange: (v: LatLng | null) => void; title?: string; hint?: string; kind?: 'home' | 'store';
}) {
  const toast = useToast();
  const [open, setOpen] = useState(!!value);
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    setBusy(true);
    try { onChange(await currentPosition()); setOpen(true); }
    catch (e: any) { toast(e.message, 'error'); setOpen(true); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-rose-600" />{title}
          {value && <span className="badge bg-green-100 text-green-800">Đã ghim</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={locate} disabled={busy} data-testid="use-my-location"><Crosshair className="h-4 w-4" />{busy ? 'Đang định vị…' : 'Vị trí hiện tại'}</button>
          {!open && <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>Chọn trên bản đồ</button>}
          {value && <button type="button" className="btn-ghost btn-sm text-slate-400" onClick={() => onChange(null)} aria-label="Bỏ ghim"><X className="h-4 w-4" /></button>}
        </div>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {open && (
        <>
          <MapView points={value ? [{ kind, ...value }] : []} onPick={onChange} height={240} />
          <p className="text-xs text-slate-400">Chạm vào bản đồ để đặt đúng vị trí{value ? ` · ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : ''}</p>
        </>
      )}
    </div>
  );
}
