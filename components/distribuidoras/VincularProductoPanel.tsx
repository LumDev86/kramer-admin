'use client';

import { useState } from 'react';
import Image from 'next/image';
import { products, FacturaItem, SuggestedProduct } from '@/lib/api';
import { money } from '@/lib/format';

type ProductoBase = { id: string; title: string; price: string };

interface Props {
  item: FacturaItem;
  suggestions: SuggestedProduct[];
  mostrandoFormCreacion: boolean;
  onVincular: (product: ProductoBase, precio: string) => void;
  actualizandoPrecio: boolean;
  onCrearNuevo: () => void;
}

export default function VincularProductoPanel({
  item,
  suggestions,
  mostrandoFormCreacion,
  onVincular,
  actualizandoPrecio,
  onCrearNuevo,
}: Props) {
  const [buscando, setBuscando] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof products.getAll>>['data'] | null>(null);
  const [confirmando, setConfirmando] = useState<ProductoBase | null>(null);
  const [precio, setPrecio] = useState('');
  const [gananciaPct, setGananciaPct] = useState('');

  const openConfirm = (product: ProductoBase) => {
    setConfirmando(product);
    setPrecio(product.price);
    setGananciaPct('');
    setBuscando(false);
    setQuery('');
    setResults(null);
  };

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const result = await products.getAll({ search: q, limit: 6 });
    setResults(result.data);
  };

  if (confirmando) {
    return (
      <div className="flex flex-col gap-1.5 mt-1 bg-kr-yellow-soft/60 border border-kr-line rounded-lg p-2 w-full">
        <p className="text-[11px] font-bold text-kr-muted">Vincular con: {confirmando.title}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Precio al público"
              className="w-full border border-kr-line rounded-lg px-2 py-1 text-xs outline-none focus:border-kr-blue"
            />
          </div>
          <div className="w-20 flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="0.1"
              value={gananciaPct}
              onChange={(e) => {
                setGananciaPct(e.target.value);
                const pct = parseFloat(e.target.value);
                const cost = Number(item.precioUnitario);
                if (cost > 0 && !isNaN(pct)) setPrecio((cost * (1 + pct / 100)).toFixed(2));
              }}
              placeholder="% gcia"
              className="w-full border border-kr-line rounded-lg px-1.5 py-1 text-xs outline-none focus:border-kr-blue"
            />
          </div>
        </div>
        {(() => {
          const cost = Number(item.precioUnitario);
          const priceNum = parseFloat(precio);
          if (!(cost > 0) || isNaN(priceNum)) return null;
          const pct = ((priceNum - cost) / cost) * 100;
          return (
            <p className={`text-[11px] font-bold ${pct >= 0 ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
              Ganancia: {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% sobre costo ({money(cost)})
            </p>
          );
        })()}
        <div className="flex gap-2 mt-0.5">
          <button
            onClick={() => setConfirmando(null)}
            className="flex-1 py-1.5 rounded-lg border border-kr-line text-[11px] font-bold text-kr-muted"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onVincular(confirmando, precio); setConfirmando(null); }}
            disabled={!precio || actualizandoPrecio}
            className="flex-1 py-1.5 rounded-lg bg-kr-yellow hover:bg-[#FFD24D] text-kr-navy border-2 border-kr-navy text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            Vincular
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => openConfirm(s)}
              title={[s.quantity, s.unit].filter(Boolean).join(' ')}
              className="px-2 py-1 rounded-lg border border-kr-navy/30 bg-kr-yellow-soft text-kr-blue text-[11px] font-bold hover:bg-kr-yellow-soft transition-colors"
            >
              ¿{s.title}?
            </button>
          ))}
        </div>
      )}
      {buscando ? (
        <div className="flex flex-col gap-1 w-full">
          <input
            autoFocus
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setBuscando(false), 150)}
            placeholder="Buscar producto..."
            className="w-full text-xs border border-kr-line rounded-lg px-2 py-1 outline-none focus:border-kr-blue"
          />
          {results && results.length > 0 && (
            <div className="w-full max-h-64 overflow-y-auto bg-white border border-kr-line rounded-xl  divide-y divide-kr-line">
              {results.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => openConfirm(p)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-kr-yellow-soft transition-colors"
                >
                  <div className="relative w-8 h-8 flex-shrink-0 bg-kr-sand rounded-md overflow-hidden">
                    <Image src={p.imageUrl} alt={p.title} fill sizes="32px" className="object-contain p-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-kr-navy">{p.title}</p>
                    <p className="text-[11px] text-kr-muted">{p.category?.name ?? 'Sin categoría'}</p>
                  </div>
                  <span className="text-xs font-bold text-kr-blue flex-shrink-0">{money(p.price)}</span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results && results.length === 0 && (
            <div className="w-full bg-white border border-kr-line rounded-xl  px-3 py-2">
              <p className="text-xs text-kr-muted font-bold">No se encontraron productos.</p>
            </div>
          )}
        </div>
      ) : mostrandoFormCreacion ? (
        <span className="text-xs text-kr-blue font-bold">Completando alta abajo ↓</span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBuscando(true); setQuery(''); setResults(null); }}
            className="text-xs text-kr-muted hover:text-kr-navy font-bold"
          >
            Sin vincular · buscar
          </button>
          <span className="text-kr-line">·</span>
          <button onClick={onCrearNuevo} className="text-xs text-kr-blue hover:text-kr-navy font-bold">
            + Crear producto nuevo
          </button>
        </div>
      )}
    </div>
  );
}
