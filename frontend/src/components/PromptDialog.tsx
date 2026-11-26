'use client';
import { X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type Options = { title: string; message?: string; label?: string; placeholder?: string; confirmText?: string; type?: 'text' | 'password'; minLength?: number; destructive?: boolean };
type Request = Options & { resolve: (value: string | null) => void };
let globalAsk: ((options: Options) => Promise<string | null>) | null = null;
export const promptDialog = (options: Options) => globalAsk?.(options) ?? Promise.resolve(null);

export function PromptDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const ask = useCallback((options: Options) => new Promise<string | null>((resolve) => { setValue(''); setRequest({ ...options, resolve }); }), []);
  globalAsk = ask;
  const close = useCallback((result: string | null) => { setRequest((current) => { current?.resolve(result); return null; }); }, []);
  useEffect(() => { if (request) setTimeout(() => input.current?.focus(), 0); }, [request]);
  const submit = (e: FormEvent) => { e.preventDefault(); if (value.trim().length >= (request?.minLength ?? 1)) close(value.trim()); };
  return <>{children}{request && (
    <div className="no-print fixed inset-0 z-[310] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && close(null)}>
      <form onSubmit={submit} role="dialog" aria-modal="true" className="animate-fade-in w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-ink">{request.title}</h2>{request.message && <p className="mt-1 text-sm leading-6 text-slate-600">{request.message}</p>}</div><button type="button" className="btn-icon btn-ghost -mt-2 -mr-2" aria-label="Đóng" onClick={() => close(null)}><X className="h-5 w-5" /></button></div>
        <label className="label mt-5 block">{request.label ?? 'Nội dung'}</label>
        <input ref={input} className="input" type={request.type ?? 'text'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={request.placeholder} minLength={request.minLength ?? 1} autoComplete={request.type === 'password' ? 'new-password' : 'off'} required />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="btn-outline" onClick={() => close(null)}>Huỷ</button><button type="submit" className={request.destructive ? 'btn-danger' : 'btn-primary'} disabled={value.trim().length < (request.minLength ?? 1)}>{request.confirmText ?? 'Xác nhận'}</button></div>
      </form>
    </div>
  )}</>;
}
