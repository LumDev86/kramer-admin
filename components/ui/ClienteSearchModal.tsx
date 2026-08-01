'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientes, Cliente } from '@/lib/api';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  onSelect: (cliente: Cliente) => void;
  onClose: () => void;
}

const LIMIT = 20;

export default function ClienteSearchModal({ onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ['clientes', 'search-modal', search, page],
    queryFn: () => clientes.getAll({ search: search || undefined, page, limit: LIMIT }),
  });

  const results = data?.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[70vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 flex-shrink-0">
          <MagnifyingGlass size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar cliente por nombre, apodo o teléfono..."
            className="flex-1 outline-none text-sm font-medium"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-50">
          {isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
              {search ? 'Sin resultados.' : 'Escribí para buscar un cliente.'}
            </p>
          ) : (
            results.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => onSelect(cliente)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">
                    {cliente.nombre} {cliente.apellido}
                    {cliente.apodo && <span className="text-gray-400 font-normal"> ({cliente.apodo})</span>}
                  </p>
                  <p className="text-xs text-gray-400">{cliente.telefono ?? 'Sin teléfono'}</p>
                </div>
                <p className={`font-bold flex-shrink-0 ${(cliente.deuda ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {money(cliente.deuda ?? 0)}
                </p>
              </button>
            ))
          )}
        </div>
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400 font-medium">
              Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} clientes
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
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
