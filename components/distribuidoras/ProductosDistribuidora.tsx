'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, products, categories, Product } from '@/lib/api';
import { MagnifyingGlass, Plus, X } from '@phosphor-icons/react';
import { money } from '@/lib/format';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import AjustarIvaModal from '@/components/ui/AjustarIvaModal';
import NuevoProductoManualForm from './NuevoProductoManualForm';

interface Props {
  distribuidorId: string;
  distribuidorNombre: string;
  ivaDiscriminado: boolean;
}

export default function ProductosDistribuidora({ distribuidorId, distribuidorNombre, ivaDiscriminado }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [priceError, setPriceError] = useState<{ id: string; message: string } | null>(null);
  const [costError, setCostError] = useState<{ id: string; message: string } | null>(null);
  const [gananciaError, setGananciaError] = useState<{ id: string; message: string } | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<Product | null>(null);
  const [pendingCantidad, setPendingCantidad] = useState('1');
  const [pendingCosto, setPendingCosto] = useState('');
  const [pendingPrecio, setPendingPrecio] = useState('');
  const [pendingError, setPendingError] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  const [showIvaAdjust, setShowIvaAdjust] = useState(false);

  const { data: productos, isLoading } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['distribuidor', distribuidorId] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  // mismo patrón que la lista de Productos: Costo, Precio y Ganancia vinculados por
  // price = cost * (1 + pct/100), tocar cualquiera manda un único PUT parcial
  type FieldEdit = { id: string; field: 'price' | 'cost' | 'ganancia'; data: { price?: number; cost?: number | null } };
  const fieldErrorSetters = { price: setPriceError, cost: setCostError, ganancia: setGananciaError };

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: FieldEdit) => {
      const form = new FormData();
      if (data.price !== undefined) form.append('price', String(data.price));
      if (data.cost !== undefined) form.append('cost', data.cost === null ? '' : String(data.cost));
      return products.update(id, form);
    },
    onSuccess: (_product, { id, field }) => {
      invalidateAll();
      fieldErrorSetters[field]((e) => (e?.id === id ? null : e));
    },
    onError: (err: any, { id, field }) => {
      fieldErrorSetters[field]({ id, message: err.message ?? 'No se pudo actualizar' });
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

      {creatingNew && (
        <NuevoProductoManualForm
          categories={catsData?.data ?? []}
          categoriesLoading={!catsData}
          onRegistrar={(product, cantidad, costo) =>
            distribuidores.registrarCompraManual(distribuidorId, product.id, { cantidad, costo })
          }
          onCreated={() => { setCreatingNew(false); invalidateAll(); }}
          onCancel={() => setCreatingNew(false)}
        />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Costo</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Precio</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => {
                  const costNum = p.cost ? parseFloat(p.cost) : null;
                  const priceNum = parseFloat(p.price);
                  const pct = costNum ? ((priceNum - costNum) / costNum) * 100 : null;
                  const rowBusy = updateFieldMutation.isPending && updateFieldMutation.variables?.id === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <Image src={p.imageUrl} alt={p.title} fill sizes="40px" className="object-contain p-1" />
                          </div>
                          <span className="font-semibold text-gray-700 truncate max-w-xs">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-500">$</span>
                          <input
                            key={p.cost ?? ''}
                            type="number"
                            step="0.01"
                            defaultValue={p.cost ?? ''}
                            placeholder="—"
                            disabled={rowBusy}
                            onBlur={(e) => {
                              const raw = e.target.value;
                              const newCost = raw === '' ? null : parseFloat(raw);
                              if (newCost !== null && (isNaN(newCost) || newCost < 0)) {
                                e.target.value = p.cost ?? '';
                                return;
                              }
                              if (newCost === costNum) return;

                              // mantiene el % de ganancia actual: si ya había costo y precio,
                              // el precio nuevo se recalcula para conservar ese mismo margen
                              let newPrice: number | undefined;
                              if (costNum && newCost !== null) {
                                const currentPct = (priceNum - costNum) / costNum;
                                newPrice = parseFloat((newCost * (1 + currentPct)).toFixed(2));
                              }

                              updateFieldMutation.mutate({
                                id: p.id,
                                field: 'cost',
                                data: { cost: newCost, ...(newPrice !== undefined && { price: newPrice }) },
                              });
                            }}
                            className="w-24 font-bold text-gray-500 bg-transparent outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                          />
                        </div>
                        {costError?.id === p.id && (
                          <p className="text-[11px] font-semibold text-red-500 mt-0.5">{costError.message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-orange-500">$</span>
                          <input
                            key={p.price}
                            type="number"
                            step="0.01"
                            defaultValue={p.price}
                            disabled={rowBusy}
                            onBlur={(e) => {
                              const newPrice = parseFloat(e.target.value);
                              if (isNaN(newPrice) || newPrice <= 0) {
                                e.target.value = p.price;
                                return;
                              }
                              if (newPrice === priceNum) return;
                              updateFieldMutation.mutate({ id: p.id, field: 'price', data: { price: newPrice } });
                            }}
                            className="w-24 font-bold text-orange-500 bg-transparent outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                          />
                        </div>
                        {priceError?.id === p.id && (
                          <p className="text-[11px] font-semibold text-red-500 mt-0.5">{priceError.message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <input
                            key={`${p.cost ?? ''}-${p.price}`}
                            type="number"
                            step="0.1"
                            defaultValue={pct !== null ? pct.toFixed(1) : ''}
                            placeholder="—"
                            disabled={!costNum || rowBusy}
                            onBlur={(e) => {
                              if (!costNum) return;
                              const raw = e.target.value;
                              const newPct = parseFloat(raw);
                              if (raw === '' || isNaN(newPct)) {
                                e.target.value = pct !== null ? pct.toFixed(1) : '';
                                return;
                              }
                              if (pct !== null && Math.abs(newPct - pct) < 0.05) return;
                              const newPrice = parseFloat((costNum * (1 + newPct / 100)).toFixed(2));
                              if (newPrice <= 0) {
                                e.target.value = pct !== null ? pct.toFixed(1) : '';
                                return;
                              }
                              updateFieldMutation.mutate({ id: p.id, field: 'ganancia', data: { price: newPrice } });
                            }}
                            className={`w-14 text-xs font-bold bg-transparent outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50 ${
                              pct === null ? 'text-gray-300' : pct >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-gray-300">%</span>
                        </div>
                        {gananciaError?.id === p.id && (
                          <p className="text-[11px] font-semibold text-red-500 mt-0.5">{gananciaError.message}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pickerOpen && (
        <ProductSearchModal
          onSelect={selectPending}
          onClose={() => setPickerOpen(false)}
          onCreateNew={() => { setPickerOpen(false); setCreatingNew(true); }}
        />
      )}

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
