'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, ProductoDistribuidor, ProductoAjustado } from '@/lib/api';
import { X, Check } from '@phosphor-icons/react';
import { money } from '@/lib/format';

interface Props {
  distribuidorId: string;
  distribuidorNombre: string;
  onClose: () => void;
  onApplied: () => void;
}

export default function AplicarAumentoModal({ distribuidorId, distribuidorNombre, onClose, onApplied }: Props) {
  const [pct, setPct] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<ProductoAjustado[] | null>(null);

  const { data: productos, isLoading } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  useEffect(() => {
    if (productos) setSelected(new Set(productos.map((p) => p.id)));
  }, [productos]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const factor = useMemo(() => {
    const n = parseFloat(pct);
    return Number.isFinite(n) && n !== 0 ? 1 + n / 100 : null;
  }, [pct]);

  const mutation = useMutation({
    mutationFn: () =>
      distribuidores.aplicarAumento(distribuidorId, { pct: parseFloat(pct), productIds: Array.from(selected) }),
    onSuccess: (data) => {
      setResultado(data);
      setError('');
      onApplied();
    },
    onError: (err: any) => setError(err.message ?? 'Error al aplicar el ajuste'),
  });

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!productos) return;
    setSelected((s) => (s.size === productos.length ? new Set() : new Set(productos.map((p) => p.id))));
  };

  const handleSubmit = () => {
    setError('');
    if (!factor) {
      setError('Ingresá un porcentaje válido, distinto de cero');
      return;
    }
    if (selected.size === 0) {
      setError('Seleccioná al menos un producto');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16 sm:pt-24 animate-fadeIn overflow-y-auto pb-8" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-800">Aplicar aumento de precios</p>
            <p className="text-xs text-gray-400">{distribuidorNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {resultado ? (
          <>
            <div className="overflow-y-auto divide-y divide-gray-50">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <p className="text-xs font-bold text-green-700">
                  Se actualizaron {resultado.length} producto{resultado.length !== 1 ? 's' : ''}.
                </p>
              </div>
              {resultado.map((p) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-700 truncate">{p.title}</p>
                  <div className="text-right text-xs flex-shrink-0">
                    {p.costNuevo && (
                      <p className="text-gray-400">
                        Costo: {money(p.costAnterior ?? 0)} → <span className="font-bold text-gray-600">{money(p.costNuevo)}</span>
                      </p>
                    )}
                    <p className="text-gray-400">
                      Venta: {money(p.precioAnterior)} → <span className="font-bold text-orange-500">{money(p.precioNuevo)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 flex-shrink-0 flex flex-col gap-2">
              <p className="text-xs text-gray-500">
                Ajusta el costo y el precio de venta en el mismo porcentaje (mantiene el margen) de todos los productos
                que alguna vez le compraste a esta distribuidora.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  placeholder="Ej: 10 (sube 10%) o -5 (baja 5%)"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
                />
                <span className="text-sm font-bold text-gray-400">%</span>
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-gray-50">
              {isLoading ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">Cargando productos...</p>
              ) : !productos || productos.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  Todavía no confirmaste ninguna factura de esta distribuidora.
                </p>
              ) : (
                <>
                  <button
                    onClick={toggleAll}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-500">
                      {selected.size} de {productos.length} seleccionados
                    </span>
                    <span className="text-xs font-bold text-orange-500">
                      {selected.size === productos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </span>
                  </button>
                  {productos.map((p: ProductoDistribuidor) => {
                    const checked = selected.has(p.id);
                    const newCost = factor && p.cost ? Number(p.cost) * factor : null;
                    const newPrice = factor ? Number(p.price) * factor : null;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? '' : 'opacity-40'} hover:bg-gray-50`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
                          className="w-4 h-4 accent-orange-500 flex-shrink-0"
                        />
                        <div className="relative w-9 h-9 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          <Image src={p.imageUrl} alt={p.title} fill sizes="36px" className="object-contain p-1" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-700 truncate">{p.title}</p>
                        </div>
                        <div className="text-right text-xs flex-shrink-0">
                          <p className="text-gray-400">
                            {money(p.price)}
                            {newPrice !== null && (
                              <span className="font-bold text-orange-500"> → {money(newPrice)}</span>
                            )}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </>
              )}
            </div>

            {error && (
              <p className="px-4 py-2 text-xs text-red-500 font-semibold bg-red-50 flex-shrink-0">{error}</p>
            )}

            <div className="p-4 border-t border-gray-100 flex-shrink-0 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || isLoading || !productos || productos.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {mutation.isPending ? 'Aplicando...' : (
                  <>
                    <Check size={15} weight="bold" />
                    Aplicar a {selected.size} producto{selected.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
