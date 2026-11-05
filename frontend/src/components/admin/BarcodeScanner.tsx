'use client';
import { Camera, CameraOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '@/components/ui';

/**
 * Quét QR / mã vạch bằng camera (html5-qrcode). Hỗ trợ QR, EAN-13, EAN-8, UPC, Code 128, Code 39.
 * Lưu ý: trình duyệt chỉ cho mở camera trên HTTPS hoặc http://localhost.
 * continuous = true: quét liên tục (POS, phiếu kho); false: đóng sau lần quét đầu.
 */
export function BarcodeScanner({ open, onClose, onScan, continuous = false, title = 'Quét mã QR / mã vạch' }: {
  open: boolean; onClose: () => void; onScan: (code: string) => void; continuous?: boolean; title?: string;
}) {
  const id = 'scanner-' + useId().replace(/:/g, '');
  const [error, setError] = useState('');
  const [last, setLast] = useState('');
  const lastRef = useRef({ code: '', at: 0 });
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!open) return;
    let scanner: any;
    let stopped = false;
    setError('');
    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode');
      if (stopped) return;
      scanner = new Html5Qrcode(id, {
        verbose: false,
        formatsToSupport: [F.QR_CODE, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39],
      });
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: (w: number, h: number) => ({ width: Math.min(w * 0.85, 320), height: Math.min(h * 0.6, 200) }) },
          (text: string) => {
            const now = Date.now();
            if (text === lastRef.current.code && now - lastRef.current.at < 2000) return; // chống quét trùng liên tiếp
            lastRef.current = { code: text, at: now };
            setLast(text);
            try { navigator.vibrate?.(60); } catch {}
            cb.current(text.trim());
            if (!continuous) onClose();
          },
          () => {},
        );
      } catch (e: any) {
        setError(
          String(e?.message ?? e).includes('Permission') || String(e).includes('NotAllowed')
            ? 'Bạn chưa cho phép truy cập camera. Hãy bật quyền camera cho trang này.'
            : 'Không mở được camera. Camera chỉ hoạt động trên HTTPS hoặc http://localhost, và thiết bị phải có camera.',
        );
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <div id={id} className="min-h-[260px] w-full [&_video]:!w-full [&_video]:object-cover" />
          {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white"><CameraOff className="h-10 w-10 text-slate-400" />{error}</div>}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-500"><Camera className="h-4 w-4" /> Đưa mã vào khung hình</span>
          {last && <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-xs text-brand-800">Vừa quét: {last}</span>}
        </div>
        {continuous && <button className="btn-primary w-full" onClick={onClose}>Xong</button>}
      </div>
    </Modal>
  );
}
