'use client';
import { Printer, X } from 'lucide-react';
import { useEffect } from 'react';

/** Khung trang in: thanh công cụ (ẩn khi in), @page tuỳ khổ giấy, tự mở hộp thoại in */
export function PrintShell({ children, page, ready, autoPrint = true, width }: {
  children: React.ReactNode; page: string; ready: boolean; autoPrint?: boolean; width: string;
}) {
  useEffect(() => {
    if (!ready || !autoPrint || new URLSearchParams(location.search).get('noprint')) return;
    // chờ ảnh (logo, QR) tải xong rồi mới in
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 300));
  }, [ready, autoPrint]);

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <style>{`@page { ${page} } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button className="btn-primary shadow-lift" onClick={() => window.print()}><Printer className="h-4 w-4" /> In</button>
        <button className="btn-outline shadow-lift" onClick={() => window.close()}><X className="h-4 w-4" /> Đóng</button>
      </div>
      <div className="mx-auto bg-white text-black shadow-lift print:shadow-none" style={{ width }}>{children}</div>
    </div>
  );
}
