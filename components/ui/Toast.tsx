'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';

type ToastTone = 'ok' | 'error';
interface ToastItem { id: number; tone: ToastTone; message: string }

const ToastContext = createContext<{ show: (message: string, tone?: ToastTone) => void } | null>(null);

// avisos cortos de "guardado" / "no se pudo guardar" - reemplazan los textos verdes/rojos sueltos
// que cada formulario dibujaba a su manera
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const show = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, tone, message }]);
    // los errores quedan más tiempo: suelen traer algo que hay que leer
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-6 z-[60] flex flex-col items-center gap-2 px-4 print:hidden">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border-2 border-kr-navy px-4 py-3 text-sm font-extrabold shadow-pop animate-slideUp ${
              t.tone === 'error' ? 'bg-[#FFE7D6] text-kr-orange-dark' : 'bg-kr-green-soft text-kr-green-dark'
            }`}
          >
            {t.tone === 'error' ? <WarningCircle size={20} weight="fill" /> : <CheckCircle size={20} weight="fill" />}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="text-current opacity-70 hover:opacity-100">
              <X size={16} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast tiene que usarse dentro de <ToastProvider>');
  return ctx;
}
