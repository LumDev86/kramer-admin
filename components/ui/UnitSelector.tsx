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
}

export default function UnitSelector({ value, onChange }: Props) {
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
    <div ref={containerRef} className="relative w-36">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
          open
            ? 'border-orange-400 bg-orange-50 text-orange-600'
            : value
            ? 'border-orange-300 bg-orange-50 text-orange-600'
            : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300'
        }`}
      >
        <span>{selected ? selected.display : 'Unidad'}</span>
        <CaretDown
          size={14}
          weight="bold"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slideUp">
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
              Seleccioná una unidad
            </p>
          </div>

          <div className="px-3 pb-3 flex flex-col gap-3 mt-2">
            {UNIT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1 mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.units.map((unit) => {
                    const isSelected = value === unit.value;
                    return (
                      <button
                        key={unit.value}
                        type="button"
                        onClick={() => handleSelect(unit.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
                        }`}
                      >
                        {isSelected && <Check size={11} weight="bold" />}
                        <span className="font-extrabold">{unit.display}</span>
                        <span className={`font-medium ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                          {unit.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {value && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors py-1"
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
