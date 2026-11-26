'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carousel ngang: vuốt/kéo trên điện thoại, nút ‹ › trên máy tính.
 * Mỗi phần tử con nên có độ rộng cố định (VD: `w-32 shrink-0`); nút tự ẩn ở đầu/cuối danh sách.
 */
export function Carousel({ children, className = '', label, gap = 'gap-3' }: { children: React.ReactNode; className?: string; label?: string; gap?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  // cuộn gần 1 khung nhìn mỗi lần bấm (chừa lại 1 phần để thấy đang nối tiếp)
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 200), behavior: 'smooth' });
  };

  const btn = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-soft transition hover:border-brand-300 hover:text-brand-700 sm:flex';
  return (
    <div className={`relative ${className}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <div ref={track} onScroll={update} className={`no-scrollbar flex snap-x snap-mandatory scroll-px-1 overflow-x-auto scroll-smooth px-1 pt-1 pb-2 ${gap} [&>*]:snap-start`}>
        {children}
      </div>
      {!edge.start && <button type="button" onClick={() => go(-1)} className={`${btn} -left-3`} aria-label="Xem trước"><ChevronLeft className="h-5 w-5" /></button>}
      {!edge.end && <button type="button" onClick={() => go(1)} className={`${btn} -right-3`} aria-label="Xem tiếp"><ChevronRight className="h-5 w-5" /></button>}
      {/* mờ dần ở mép báo hiệu còn nội dung */}
      {!edge.start && <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50 to-transparent" />}
      {!edge.end && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 to-transparent" />}
    </div>
  );
}
