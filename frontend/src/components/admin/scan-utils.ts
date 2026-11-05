'use client';
import { useEffect, useRef } from 'react';

let ctx: AudioContext | null = null;
/** Âm báo quét: ok = 1 tiếng bíp cao, error = 2 tiếng trầm */
export function beep(kind: 'ok' | 'error' = 'ok') {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const tones = kind === 'ok' ? [[1760, 0, 0.09]] : [[330, 0, 0.14], [260, 0.17, 0.2]];
    for (const [freq, start, dur] of tones) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = kind === 'ok' ? 'sine' : 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(kind === 'ok' ? 0.25 : 0.12, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.02);
    }
    navigator.vibrate?.(kind === 'ok' ? 40 : [60, 40, 60]);
  } catch {}
}

const isEditable = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

/**
 * Bắt máy quét mã vạch USB/Bluetooth (dạng bàn phím) ở MỌI NƠI trên trang, kể cả khi không focus ô nhập.
 * Máy quét gõ rất nhanh (< 35ms/ký tự) rồi Enter → phân biệt được với người gõ tay.
 * Khi focus đang ở ô nhập, để ô nhập tự xử lý (tránh xử lý 2 lần).
 */
export function useHidScanner(onScan: (code: string) => void, enabled = true) {
  const cb = useRef(onScan);
  cb.current = onScan;
  useEffect(() => {
    if (!enabled) return;
    let buf = '';
    let last = 0;
    let fast = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(document.activeElement)) return;
      const now = performance.now();
      const gap = now - last;
      last = now;
      if (gap > 80) { buf = ''; fast = 0; }
      if (e.key === 'Enter') {
        if (buf.length >= 3 && fast >= buf.length - 2) { e.preventDefault(); cb.current(buf); }
        buf = ''; fast = 0;
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (buf && gap < 35) fast++;
        buf += e.key;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);
}
