'use client';

import { useState, useRef, useEffect } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';

const UNIT_GROUPS = [
  {
    label: 'Peso',
    units: [
      { value: 'g',  display: 'g',  description: 'gramos'      },
      { value: 'kg', display: 'kg', description: 'kilogramos'  },
    ],
  },
  {
    label: 'Volumen',
    units: [
      { value: 'ml', display: 'ml', description: 'mililitros'         },
      { value: 'L',  display: 'L',  description: 'litros'             },
      { value: 'cc', display: 'cc', description: 'centímetros cúbicos' },
    ],
  },
  {
    label: 'Cantidad',
    units: [
      { value: 'un',   display: 'un.',  description: 'unidad' },
      { value: 'pack', display: 'pack', description: 'pack'   },
    ],
  },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  // ancho del disparador; por defecto fijo, en el formulario de producto ocupa su columna
  className?: string;
}

export default function UnitSelector({ value, onChange, id, className = 'w-36' }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = UNIT_GROUPS.flatMap((g) => g.units).find((u) => u.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (unitValue: string) => {
    onChange(unitValue === value ? '' : unitValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className={`box-border flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border-[1.5px] bg-kr-paper px-3 py-2 text-[15px] font-bold transition-colors ${
          open ? 'border-kr-blue' : 'border-kr-line hover:border-kr-navy/40'
        } ${selected ? 'text-kr-navy' : 'text-kr-muted'}`}
      >
        <span>{selected ? selected.display : 'Unidad'}</span>
        <CaretDown size={14} weight="bold" className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border-2 border-kr-navy bg-white shadow-pop animate-fadeIn">
          <div className="flex flex-col gap-3 p-3">
            {UNIT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-kr-muted">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.units.map((unit) => {
                    const isSelected = value === unit.value;
                    return (
                      <button
                        key={unit.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSelect(unit.value)}
                        className={`flex min-h-9 items-center gap-1.5 rounded-xl border-[1.5px] px-3 py-1.5 text-[13px] font-bold transition-colors ${
                          isSelected
                            ? 'border-kr-navy bg-kr-yellow text-kr-navy'
                            : 'border-kr-line bg-kr-paper text-kr-navy hover:border-kr-navy/40'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                        <span className="font-extrabold">{unit.display}</span>
                        <span className={isSelected ? 'text-kr-navy/80' : 'text-kr-muted'}>{unit.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {value && (
            <div className="border-t border-kr-line px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="min-h-9 w-full rounded-lg text-[13px] font-extrabold text-kr-muted hover:bg-kr-sand hover:text-kr-orange-dark"
              >
                Quitar unidad
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
