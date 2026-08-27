'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, products, ProductoDistribuidor } from '@/lib/api';
import { MagnifyingGlass, PencilSimple, Check, X, Plus } from '@phosphor-icons/react';
import { money } from '@/lib/format';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

interface Props {
  distribuidorId: string;
  onCargarManual: () => void;
  cargandoManual: boolean;
  ivaDiscriminado: boolean;
  onToggleIva: () => void;
  togglingIva: boolean;
}

export default function ProductosDistribuidora({
  distribuidorId,
  onCargarManual,
  cargandoManual,
  ivaDiscriminado,
  onToggleIva,
  togglingIva,
}: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');

  const { data: productos, isLoading } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { price: string; cost: string } }) => {
      const form = new FormData();
      form.append('price', data.price);
      form.append('cost', data.cost);
      return products.update(id, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribuidor', distribuidorId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditingId(null);
    },
  });

  const startEdit = (p: ProductoDistribuidor) => {
    setEditingId(p.id);
    setPrice(p.price);
    setCost(p.cost ?? '');
  };

  const filtered = (productos ?? []).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
          <span className="text-xs font-bold text-gray-500">IVA discriminado</span>
          <ToggleSwitch checked={ivaDiscriminado} loading={togglingIva} onChange={onToggleIva} />
        </div>
        <button
          onClick={onCargarManual}
          disabled={cargandoManual}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <Plus size={16} weight="bold" />
          {cargandoManual ? 'Creando...' : 'Cargar producto manualmente'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 font-medium">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 font-medium">
            {productos && productos.length > 0
              ? 'Ningún producto coincide con la búsqueda.'
              : 'Todavía no confirmaste ninguna factura de esta distribuidora.'}
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <Image src={p.imageUrl} alt={p.title} fill sizes="40px" className="object-contain p-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-700 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      Costo: {p.cost ? money(p.cost) : '—'} · Venta: {money(p.price)}
                    </p>
                  </div>
                  {editingId !== p.id && (
                    <button
                      onClick={() => startEdit(p)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0 transition-colors"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </button>
                  )}
                </div>
                {editingId === p.id && (
                  <div className="flex items-end gap-2 mt-2.5 pl-[52px]">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Costo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Venta</label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
                      />
                    </div>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0 transition-colors"
                    >
                      <X size={15} weight="bold" />
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: p.id, data: { price, cost } })}
                      disabled={updateMutation.isPending || !price}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 text-white flex-shrink-0 disabled:opacity-50 transition-colors"
                    >
                      <Check size={15} weight="bold" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
