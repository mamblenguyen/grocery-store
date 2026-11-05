'use client';
import { CameraOff, RefreshCw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

/** Camera quét liên tục nhúng trong trang (dùng cho quầy thu ngân / kho) */
export function CameraScanPanel({ onScan, active, maxWidth = 380 }: { onScan: (code: string) => void; active: boolean; maxWidth?: number }) {
  const id = 'cam-' + useId().replace(/:/g, '');
  const [error, setError] = useState('');
  const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [camId, setCamId] = useState<string | null>(null);
  const lastRef = useRef({ code: '', at: 0 });
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!active) return;
    let scanner: any;
    let stopped = false;
    setError('');
    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode');
      if (stopped) return;
      try {
        const list = await Html5Qrcode.getCameras();
        if (!stopped) setCams(list.map((c) => ({ id: c.id, label: c.label || 'Camera' })));
      } catch {}
      scanner = new Html5Qrcode(id, { verbose: false, formatsToSupport: [F.QR_CODE, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39] });
      try {
        await scanner.start(
          camId ? { deviceId: { exact: camId } } : { facingMode: 'environment' },
          // Vùng quét = 80% cạnh ngắn (đủ cho cả QR và mã vạch); KHÔNG crop video để toạ độ vùng quét khớp
          { fps: 15, qrbox: (w: number, h: number) => { const s = Math.floor(Math.min(w, h) * 0.8); return { width: Math.min(w * 0.92, Math.floor(s * 1.25)), height: s }; } },
          (text: string) => {
            const now = Date.now();
            // Cùng mã trong 1,5 giây → bỏ qua (tránh cộng nhiều lần khi mã còn trong khung hình)
            if (text === lastRef.current.code && now - lastRef.current.at < 1500) return;
            lastRef.current = { code: text, at: now };
            cb.current(text.trim());
          },
          () => {},
        );
      } catch (e: any) {
        setError(/Permission|NotAllowed/i.test(String(e?.message ?? e)) ? 'Chưa cho phép truy cập camera' : 'Không mở được camera (cần HTTPS hoặc localhost)');
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [active, camId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  return (
    <div className="relative mx-auto min-h-[180px] w-full overflow-hidden rounded-xl bg-slate-900" style={{ maxWidth }}>
      <div id={id} className="w-full [&_video]:!w-full" />
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white"><CameraOff className="h-8 w-8 text-slate-400" />{error}</div>}
      {cams.length > 1 && (
        <button
          type="button"
          onClick={() => { const i = cams.findIndex((c) => c.id === camId); setCamId(cams[(i + 1) % cams.length].id); }}
          className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs text-white"
        ><RefreshCw className="h-3.5 w-3.5" /> Đổi camera</button>
      )}
    </div>
  );
}
