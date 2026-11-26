'use client';
import { CircleCheck, CircleX } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; msg: string; type: 'success' | 'error' };
const Ctx = createContext<(msg: string, type?: Toast['type']) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="no-print pointer-events-none fixed top-4 right-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-in pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-700 shadow-lift">
            {t.type === 'success' ? <CircleCheck className="h-5 w-5 shrink-0 text-brand-600" /> : <CircleX className="h-5 w-5 shrink-0 text-red-500" />}
            <span className="pt-0.5">{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
