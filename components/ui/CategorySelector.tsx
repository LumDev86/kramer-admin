'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CaretDown, Check, MagnifyingGlass, Tag, X } from '@phosphor-icons/react';
import { Category } from '@/lib/api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  categories: Category[]; // top-level con children incluidos
  loading?: boolean;
  id?: string;
}

type FlatItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  parentName?: string; // si es subcategoría
};

function Miniatura({ url, size }: { url: string | null; size: number }) {
  return (
    <span className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-kr-sand text-kr-muted" style={{ width: size, height: size }}>
      {url ? <Image src={url} alt="" width={size} height={size} className="h-full w-full object-cover" /> : <Tag size={size * 0.55} weight="bold" />}
    </span>
  );
}

export default function CategorySelector({ value, onChange, categories, loading, id }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Buscar el item seleccionado en top-level o en children
  const selectedTopLevel = categories.find((c) => c.id === value);
  const selectedChild = !selectedTopLevel
    ? categories.flatMap((c) => c.children.map((ch) => ({ ...ch, parentName: c.name }))).find((c) => c.id === value)
    : null;
  const selected = selectedTopLevel ?? selectedChild ?? null;
  const selectedParentName = selectedChild?.parentName;

  // Lista plana para búsqueda
  const flatItems: FlatItem[] = categories.flatMap((cat) =>
    cat.children.length > 0
      ? cat.children.map((ch) => ({ ...ch, parentName: cat.name }))
      : [{ id: cat.id, name: cat.name, imageUrl: cat.imageUrl }]
  );

  const lowerSearch = search.toLowerCase();
  const filteredFlat = flatItems.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerSearch) ||
      (item.parentName?.toLowerCase().includes(lowerSearch) ?? false)
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

  const opcion = (isSelected: boolean, extra = '') =>
    `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold transition-colors ${
      isSelected ? 'bg-kr-yellow-soft text-kr-navy' : 'text-kr-navy hover:bg-kr-paper'
    } ${extra}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); }
          if (e.key === 'Escape') setOpen(false);
        }}
        className={`box-border flex min-h-11 w-full cursor-pointer select-none items-center gap-2 rounded-xl border-[1.5px] bg-kr-paper px-3 py-2 text-left text-[15px] font-bold text-kr-navy transition-colors ${
          open ? 'border-kr-blue' : 'border-kr-line hover:border-kr-navy/40'
        }`}
      >
        {selected ? (
          <>
            <Miniatura url={selected.imageUrl} size={24} />
            <span className="min-w-0 flex-1 leading-tight">
              {selectedParentName && <span className="text-kr-muted">{selectedParentName} › </span>}
              {selected.name}
            </span>
            <button type="button" onClick={handleClear} aria-label="Quitar categoría" className="flex-shrink-0 rounded-md p-1 text-kr-muted hover:bg-kr-sand hover:text-kr-navy">
              <X size={14} weight="bold" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-kr-muted">{loading ? 'Cargando…' : 'Sin categoría'}</span>
            <CaretDown size={14} weight="bold" className={`flex-shrink-0 text-kr-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 min-w-[240px] overflow-hidden rounded-2xl border-2 border-kr-navy bg-white shadow-pop animate-fadeIn">
          <div className="border-b border-kr-line p-2">
            <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-2.5 focus-within:border-kr-blue">
              <MagnifyingGlass size={15} weight="bold" className="text-kr-muted" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                  // Enter no tiene que mandar el formulario de afuera
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (search && filteredFlat.length === 1) handleSelect(filteredFlat[0].id);
                  }
                }}
                aria-label="Buscar categoría"
                placeholder="Buscar categoría…"
                className="min-h-10 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div role="listbox" className="max-h-72 overflow-y-auto py-1.5">
            <button type="button" onClick={() => handleSelect('')} className={opcion(!value, 'text-kr-muted')}>
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-kr-sand">—</span>
              <span className="flex-1">Sin categoría</span>
              {!value && <Check size={14} weight="bold" className="flex-shrink-0" />}
            </button>

            {search ? (
              /* Modo búsqueda: lista plana con contexto del padre */
              <>
                {filteredFlat.length === 0 && <p className="py-4 text-center text-sm font-bold text-kr-muted">Sin resultados</p>}
                {filteredFlat.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => handleSelect(item.id)} className={opcion(isSelected)}>
                      <Miniatura url={item.imageUrl} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.name}</span>
                        {item.parentName && <span className="block text-xs text-kr-muted">en {item.parentName}</span>}
                      </span>
                      {isSelected && <Check size={14} weight="bold" className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </>
            ) : (
              /* Modo normal: vista jerárquica */
              <>
                {categories.length === 0 && <p className="py-4 text-center text-sm font-bold text-kr-muted">Sin categorías</p>}
                {categories.map((cat) => {
                  if (cat.children.length > 0) {
                    return (
                      <div key={cat.id}>
                        {/* Header no seleccionable */}
                        <div className="flex items-center gap-2.5 px-3 pb-1 pt-2.5 text-[11px] font-extrabold uppercase tracking-wide text-kr-muted">
                          <Miniatura url={cat.imageUrl} size={20} />
                          <span>{cat.name}</span>
                        </div>
                        {cat.children.map((sub) => {
                          const isSelected = value === sub.id;
                          return (
                            <button key={sub.id} type="button" onClick={() => handleSelect(sub.id)} className={opcion(isSelected, 'pl-8')}>
                              <Miniatura url={sub.imageUrl} size={24} />
                              <span className="flex-1">{sub.name}</span>
                              {isSelected && <Check size={14} weight="bold" className="flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  // Top-level sin subcategorías → directamente seleccionable
                  const isSelected = value === cat.id;
                  return (
                    <button key={cat.id} type="button" onClick={() => handleSelect(cat.id)} className={opcion(isSelected)}>
                      <Miniatura url={cat.imageUrl} size={28} />
                      <span className="flex-1">{cat.name}</span>
                      {isSelected && <Check size={14} weight="bold" className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
