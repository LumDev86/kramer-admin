'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  // acciones fijas abajo (Cancelar / Guardar); el cuerpo scrollea entre el título y esto
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

// ventana encima de la pantalla: se cierra con Escape, con la X o tocando afuera.
// En celular ocupa todo el ancho y se pega abajo, para que los botones queden al alcance del pulgar.
export default function Modal({ title, subtitle, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-kr-navy/50 animate-fadeIn sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl border-2 border-kr-navy bg-white shadow-pop-lg animate-slideUp sm:rounded-2xl ${SIZES[size]}`}
      >
        <div className="flex items-start gap-3 border-b border-kr-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="font-display text-xl leading-tight text-kr-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm font-bold text-kr-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-kr-navy hover:bg-kr-sand"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2.5 border-t border-kr-line bg-kr-cream px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  );
}
