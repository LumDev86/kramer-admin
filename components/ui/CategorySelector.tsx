'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Category } from '@/lib/api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  loading?: boolean;
}

export default function CategorySelector({ value, onChange, categories, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = categories.find((c) => c.id === value);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (id: string) => {
    onChange(id === value ? '' : id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors text-left ${
          open
            ? 'border-orange-400 bg-orange-50'
            : selected
            ? 'border-orange-300 bg-orange-50'
            : 'border-gray-200 bg-white hover:border-orange-300'
        }`}
      >
        {selected ? (
          <>
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {selected.imageUrl ? (
                <Image src={selected.imageUrl} alt={selected.name} width={24} height={24} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-[10px]">🏷️</div>
              )}
            </div>
            <span className="flex-1 truncate text-orange-600">{selected.name}</span>
            <button type="button" onClick={handleClear} className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors">
              <X size={13} weight="bold" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-gray-400">{loading ? 'Cargando...' : 'Sin categoría'}</span>
            <CaretDown
              size={14}
              weight="bold"
              className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slideUp min-w-[220px]">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full pl-8 pr-3 py-2 text-xs font-medium outline-none bg-gray-50 rounded-xl focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1.5">
            {/* Sin categoría */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${
                !value
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">—</div>
              <span className="flex-1 text-left">Sin categoría</span>
              {!value && <Check size={13} weight="bold" className="text-orange-500 flex-shrink-0" />}
            </button>

            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4 font-medium">Sin resultados</p>
            )}

            {filtered.map((cat) => {
              const isSelected = value === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {cat.imageUrl ? (
                      <Image src={cat.imageUrl} alt={cat.name} width={28} height={28} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full bg-orange-100 flex items-center justify-center text-sm">🏷️</div>
                    )}
                  </div>
                  <span className="flex-1 text-left truncate">{cat.name}</span>
                  {isSelected && <Check size={13} weight="bold" className="text-orange-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
