'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown, Camera, NotePencil, Package, Plus } from '@phosphor-icons/react';
import { buttonClasses } from '@/components/ui/Button';

interface Props {
  onEscanear: (file: File) => void;
  onManual: () => void;
  onSuelto: () => void;
  disabled?: boolean;
}

// las tres formas de cargar una compra a una distribuidora, juntas en un solo botón
export default function NuevaCompraMenu({ onEscanear, onManual, onSuelto, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const elegir = (fn: () => void) => { setOpen(false); fn(); };

  const item = 'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-kr-yellow-soft';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        className={buttonClasses('primary', 'md')}
      >
        <Plus size={18} weight="bold" />
        Nueva compra
        <CaretDown size={16} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* capture: en el celular abre la cámara directo; en la compu, el selector de archivos */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onEscanear(f);
          e.target.value = '';
        }}
      />

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 flex w-[min(330px,calc(100vw-32px))] flex-col rounded-2xl border-2 border-kr-navy bg-white p-1.5 shadow-pop animate-fadeIn">
          <button role="menuitem" type="button" className={item} onClick={() => elegir(() => fileRef.current?.click())}>
            <Camera size={22} weight="bold" className="mt-0.5 flex-shrink-0 text-kr-blue" />
            <span className="flex flex-col">
              <b className="font-extrabold">Escanear factura</b>
              <small className="text-[13px] font-bold text-kr-muted">
                Sacale una foto y la IA carga los productos. Sale mejor con buena luz y la hoja derecha.
              </small>
            </span>
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => elegir(onManual)}>
            <NotePencil size={22} weight="bold" className="mt-0.5 flex-shrink-0 text-kr-blue" />
            <span className="flex flex-col">
              <b className="font-extrabold">Cargar factura a mano</b>
              <small className="text-[13px] font-bold text-kr-muted">Agregás cada producto con su costo.</small>
            </span>
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => elegir(onSuelto)}>
            <Package size={22} weight="bold" className="mt-0.5 flex-shrink-0 text-kr-blue" />
            <span className="flex flex-col">
              <b className="flex items-center gap-2 font-extrabold">
                Producto suelto
                <kbd className="rounded border border-kr-line bg-kr-paper px-1 text-[11px] font-extrabold text-kr-muted">F10</kbd>
              </b>
              <small className="text-[13px] font-bold text-kr-muted">Una compra rápida de un solo producto.</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
