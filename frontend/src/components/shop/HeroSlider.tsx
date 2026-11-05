'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { imageUrl } from '@/lib/api';
import type { Banner } from '@/lib/types';

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className="group relative aspect-[16/9] overflow-hidden rounded-3xl bg-slate-200 sm:aspect-[21/9]">
      {banners.map((b, idx) => (
        <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(b.image)} alt={b.title ?? ''} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center gap-3 p-6 sm:gap-4 sm:p-12">
            {b.title && <h2 className="text-2xl leading-tight font-extrabold text-white drop-shadow sm:text-4xl lg:text-5xl">{b.title}</h2>}
            {b.subtitle && <p className="text-sm text-white/90 sm:text-lg">{b.subtitle}</p>}
            {b.link && <Link href={b.link} className="btn-accent btn-lg mt-2 w-fit">{b.buttonText || 'Xem ngay'}</Link>}
          </div>
        </div>
      ))}
      {n > 1 && (
        <>
          <button onClick={() => setI((i - 1 + n) % n)} className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 shadow transition group-hover:opacity-100 sm:flex" aria-label="Trước"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => setI((i + 1) % n)} className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 shadow transition group-hover:opacity-100 sm:flex" aria-label="Sau"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, idx) => <button key={idx} onClick={() => setI(idx)} className={`h-2 rounded-full transition-all ${idx === i ? 'w-7 bg-white' : 'w-2 bg-white/50'}`} aria-label={`Banner ${idx + 1}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
