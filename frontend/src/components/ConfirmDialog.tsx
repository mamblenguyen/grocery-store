'use client';
import { AlertTriangle, CircleHelp, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Options = { title: string; message?: string; confirmText?: string; destructive?: boolean };
type Request = Options & { resolve: (value: boolean) => void };
const Ctx = createContext<(options: Options) => Promise<boolean>>(async () => false);
let globalAsk: ((options: Options) => Promise<boolean>) | null = null;

/** Dùng ngoài hook (event handler/service). Luôn hiển thị popup của ứng dụng. */
export function confirmDialog(title: string, message = '', confirmText = 'Xác nhận', destructive = false) {
  return globalAsk?.({ title, message, confirmText, destructive }) ?? Promise.resolve(false);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const ask = useCallback((options: Options) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })), []);
  globalAsk = ask;
  const close = useCallback((result: boolean) => {
    setRequest((current) => { current?.resolve(result); return null; });
  }, []);

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, close]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {request && (
        <div className="no-print fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={request.message ? 'confirm-message' : undefined}
            className="animate-fade-in w-full max-w-md rounded-2xl border border-white/50 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${request.destructive ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}`}>
                {request.destructive ? <AlertTriangle className="h-5 w-5" /> : <CircleHelp className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-lg font-bold text-ink">{request.title}</h2>
                {request.message && <p id="confirm-message" className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">{request.message}</p>}
              </div>
              <button type="button" className="btn-icon btn-ghost -mt-2 -mr-2" aria-label="Đóng" onClick={() => close(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-outline" onClick={() => close(false)}>Huỷ</button>
              <button ref={confirmRef} type="button" className={request.destructive ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>
                {request.confirmText ?? 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
