'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, products, Product, ProductoDistribuidor } from '@/lib/api';
import { MagnifyingGlass, PencilSimple, Check, X, Plus } from '@phosphor-icons/react';
import { money } from '@/lib/format';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import AjustarIvaModal from '@/components/ui/AjustarIvaModal';

interface Props {
  distribuidorId: string;
  distribuidorNombre: string;
  ivaDiscriminado: boolean;
}

export default function ProductosDistribuidora({ distribuidorId, distribuidorNombre, ivaDiscriminado }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<Product | null>(null);
  const [pendingCantidad, setPendingCantidad] = useState('1');
  const [pendingCosto, setPendingCosto] = useState('');
  const [pendingPrecio, setPendingPrecio] = useState('');
  const [pendingError, setPendingError] = useState('');

  const [showIvaAdjust, setShowIvaAdjust] = useState(false);

  const { data: productos, isLoading } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['distribuidor', distribuidorId] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { price: string; cost: string } }) => {
      const form = new FormData();
      form.append('price', data.price);
      form.append('cost', data.cost);
      return products.update(id, form);
    },
    onSuccess: () => {
      invalidateAll();
      setEditingId(null);
    },
  });

  const compraManualMutation = useMutation({
    mutationFn: () => {
      const costo = parseFloat(pendingCosto);
      const precioNum = parseFloat(pendingPrecio);
      return distribuidores.registrarCompraManual(distribuidorId, pending!.id, {
        cantidad: parseFloat(pendingCantidad || '1'),
        costo,
        ...(pendingPrecio !== '' && !isNaN(precioNum) && precioNum !== Number(pending!.price) && { precio: precioNum }),
      });
    },
    onSuccess: () => {
      invalidateAll();
      setPending(null);
      setPendingCosto('');
      setPendingPrecio('');
      setPendingCantidad('1');
      setPendingError('');
    },
    onError: (err: any) => setPendingError(err.message ?? 'No se pudo registrar la compra'),
  });

  const toggleIvaMutation = useMutation({
    mutationFn: (value: boolean) => distribuidores.update(distribuidorId, { ivaDiscriminado: value }),
    onSuccess: invalidateAll,
  });

  const handleToggleIva = () => {
    if ((productos?.length ?? 0) === 0) {
      toggleIvaMutation.mutate(!ivaDiscriminado);
    } else {
      setShowIvaAdjust(true);
    }
  };

  const startEdit = (p: ProductoDistribuidor) => {
    setEditingId(p.id);
    setPrice(p.price);
    setCost(p.cost ?? '');
  };

  const selectPending = (p: Product) => {
    setPending(p);
    setPickerOpen(false);
    setPendingCosto(p.cost ?? '');
    setPendingPrecio(p.price);
    setPendingCantidad('1');
    setPendingError('');
  };

  const filtered = (productos ?? []).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const pendingCostNum = parseFloat(pendingCosto || '0') || 0;
  const pendingPrecioNum = parseFloat(pendingPrecio || '0') || 0;
  const pendingPct = pendingCostNum ? ((pendingPrecioNum - pendingCostNum) / pendingCostNum) * 100 : null;

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
          <ToggleSwitch checked={ivaDiscriminado} loading={toggleIvaMutation.isPending} onChange={handleToggleIva} />
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0"
        >
          <Plus size={16} weight="bold" />
          Cargar producto manualmente
        </button>
      </div>

      {pending && (
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
              <Image src={pending.imageUrl} alt={pending.title} fill sizes="40px" className="object-contain p-1" />
            </div>
            <p className="text-sm font-semibold text-gray-700 flex-1 truncate">{pending.title}</p>
            <button
              onClick={() => { setPending(null); setPendingError(''); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cantidad</label>
              <input
                type="number"
                step="1"
                min="1"
                value={pendingCantidad}
                onChange={(e) => setPendingCantidad(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Costo</label>
              <input
                type="number"
                step="0.01"
                value={pendingCosto}
                onChange={(e) => setPendingCosto(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Precio</label>
              <input
                type="number"
                step="0.01"
                value={pendingPrecio}
                onChange={(e) => setPendingPrecio(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ganancia</label>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  step="0.1"
                  value={pendingPct !== null ? pendingPct.toFixed(1) : ''}
                  disabled={!pendingCostNum}
                  onChange={(e) => {
                    const newPct = parseFloat(e.target.value);
                    if (isNaN(newPct) || !pendingCostNum) return;
                    setPendingPrecio((pendingCostNum * (1 + newPct / 100)).toFixed(2));
                  }}
                  className="w-16 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 disabled:opacity-50"
                />
                <span className="text-xs font-bold text-gray-400">%</span>
              </div>
            </div>
            <button
              onClick={() => compraManualMutation.mutate()}
              disabled={!pendingCosto || !pendingPrecio || compraManualMutation.isPending}
              className="py-2 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {compraManualMutation.isPending ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
          {pendingError && <p className="text-xs font-semibold text-red-500">{pendingError}</p>}
        </div>
      )}

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

      {pickerOpen && <ProductSearchModal onSelect={selectPending} onClose={() => setPickerOpen(false)} />}

      {showIvaAdjust && (
        <AjustarIvaModal
          distribuidorId={distribuidorId}
          distribuidorNombre={distribuidorNombre}
          turningOn={!ivaDiscriminado}
          onClose={() => setShowIvaAdjust(false)}
          onApplied={invalidateAll}
        />
      )}
    </div>
  );
}
