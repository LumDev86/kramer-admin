'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientes, Cliente } from '@/lib/api';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { money } from '@/lib/format';

interface Props {
  onSelect: (cliente: Cliente) => void;
  onClose: () => void;
}

const LIMIT = 20;

export default function ClienteSearchModal({ onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['clientes', 'search-modal', search, page],
    queryFn: () => clientes.getAll({ search: search || undefined, page, limit: LIMIT }),
  });

  const results = data?.data ?? [];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results.length, page, search]);

  // Ref para que el listener (suscripto una sola vez) siempre vea los valores del último render
  const stateRef = useRef({ results, highlightedIndex, onSelect, onClose });
  stateRef.current = { results, highlightedIndex, onSelect, onClose };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { results, highlightedIndex, onSelect, onClose } = stateRef.current;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length > 0) setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length > 0) setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'F2' || e.key === 'Enter') {
        e.preventDefault();
        if (results[highlightedIndex]) onSelect(results[highlightedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-kr-navy/50 px-3 pt-6 sm:px-4 sm:pt-20 animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl border-2 border-kr-navy shadow-pop-lg w-full max-w-xl flex flex-col max-h-[85vh] sm:max-h-[75vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-2 pl-4 border-b border-kr-line flex-shrink-0">
          <MagnifyingGlass size={20} weight="bold" className="text-kr-blue flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar cliente por nombre, apodo o teléfono..."
            className="flex-1 min-w-0 min-h-11 outline-none text-base font-bold text-kr-navy placeholder:text-kr-muted/70"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-kr-muted hover:bg-kr-sand hover:text-kr-navy transition-colors flex-shrink-0"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <p className="hidden md:block px-4 py-1.5 text-xs text-kr-muted font-bold bg-kr-paper border-b border-kr-line flex-shrink-0">
          ↑↓ para moverte · Enter para elegir · Esc para cerrar
        </p>
        <div className="overflow-y-auto divide-y divide-dashed divide-kr-line">
          {isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-kr-muted font-bold">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-kr-muted font-bold">
              {search ? 'Sin resultados.' : 'Escribí para buscar un cliente.'}
            </p>
          ) : (
            results.map((cliente, i) => (
              <button
                type="button"
                key={cliente.id}
                ref={(el) => { if (i === highlightedIndex) el?.scrollIntoView({ block: 'nearest' }); }}
                onClick={() => onSelect(cliente)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 min-h-14 text-left transition-colors ${
                  i === highlightedIndex ? 'bg-kr-yellow-soft shadow-[inset_4px_0_0_#F26B1D]' : 'hover:bg-kr-paper'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-kr-navy leading-snug break-words">
                    {cliente.nombre} {cliente.apellido}
                    {cliente.apodo && <span className="text-kr-muted font-bold"> ({cliente.apodo})</span>}
                  </p>
                  <p className="text-xs font-bold text-kr-muted">{cliente.telefono ?? 'Sin teléfono'}</p>
                </div>
                <p className={`font-extrabold tabular-nums whitespace-nowrap flex-shrink-0 ${(cliente.deuda ?? 0) > 0 ? 'text-kr-orange-dark' : 'text-kr-muted'}`}>
                  {money(cliente.deuda ?? 0)}
                </p>
              </button>
            ))
          )}
        </div>
        {data && data.meta.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-kr-line bg-kr-paper flex-shrink-0">
            <p className="text-xs text-kr-muted font-bold">
              Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} clientes
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="min-h-9 px-3 rounded-[10px] border-[1.5px] border-kr-line bg-white text-[13px] font-extrabold text-kr-navy disabled:opacity-40 hover:border-kr-navy/40 transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.meta.totalPages}
                className="min-h-9 px-3 rounded-[10px] border-[1.5px] border-kr-line bg-white text-[13px] font-extrabold text-kr-navy disabled:opacity-40 hover:border-kr-navy/40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
