'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { products, Product } from '@/lib/api';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export default function ProductSearchModal({ onSelect, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');

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
    queryKey: ['products', 'search-modal', search],
    queryFn: () => products.getAll({ search: search || undefined, limit: 20 }),
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto por nombre..."
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
              {search ? 'Sin resultados.' : 'Escribí para buscar un producto.'}
            </p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{product.title}</p>
                  <p className="text-xs text-gray-400">
                    Stock: {product.stock}
                    {product.barcode ? ` · ${product.barcode}` : ''}
                  </p>
                </div>
                <p className="font-bold text-orange-500 flex-shrink-0">{money(product.price)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
