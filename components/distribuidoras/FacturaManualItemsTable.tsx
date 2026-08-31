'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { facturas, products, FacturaItem } from '@/lib/api';
import { Trash } from '@phosphor-icons/react';
import { money } from '@/lib/format';

interface Props {
  facturaId: string;
  items: FacturaItem[];
  onChanged: () => void;
}

const FIELDS = ['cantidad', 'costo', 'precio', 'ganancia', 'codigoArticulo'] as const;
type Field = (typeof FIELDS)[number];

const focusCell = (row: number, field: Field) => {
  const el = document.querySelector<HTMLInputElement>(`[data-row="${row}"][data-field="${field}"]`);
  el?.focus();
  el?.select();
};

// tabla de líneas para una factura armada a mano: a diferencia de la revisión de una factura
// escaneada (FacturaItemRow), acá el producto ya viene vinculado desde que se agrega la línea,
// así que todo se edita directo en la fila - cantidad/costo/código van al ítem de la factura,
// precio/ganancia van al producto (confirmar la factura es lo que sincroniza el costo final
// al producto). Navegable con flechas arriba/abajo (misma columna, otra fila), Enter (guarda
// y pasa al siguiente campo de la fila) y Tab (orden natural del navegador).
export default function FacturaManualItemsTable({ facturaId, items, onChanged }: Props) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [bultoOpenId, setBultoOpenId] = useState<string | null>(null);
  const [bultoUnidades, setBultoUnidades] = useState('');
  const [bultoPrecio, setBultoPrecio] = useState('');
  const [bultoCantidad, setBultoCantidad] = useState('1');

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Parameters<typeof facturas.updateItem>[2] }) =>
      facturas.updateItem(facturaId, itemId, data),
    onSuccess: () => { onChanged(); setError(''); },
    onError: (err: any) => setError(err.message ?? 'No se pudo guardar el cambio'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) => {
      const form = new FormData();
      form.append('price', String(price));
      return products.update(productId, form);
    },
    onSuccess: () => {
      onChanged();
      qc.invalidateQueries({ queryKey: ['products'] });
      setError('');
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo guardar el precio'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => facturas.removeItem(facturaId, itemId),
    onSuccess: onChanged,
  });

  const openBulto = (item: FacturaItem) => {
    setBultoOpenId(item.id);
    setBultoUnidades(item.unidadesPorBultoDetectada != null ? String(item.unidadesPorBultoDetectada) : '');
    setBultoPrecio('');
    setBultoCantidad('1');
  };

  // convierte "compré N bultos de esta caja a $X cada una, y cada caja trae Y unidades" a lo
  // que realmente se guarda (cantidad y costo SIEMPRE en unidades individuales, igual que
  // hace la IA al leer una factura escaneada por bulto - ver invoiceExtraction.ts)
  const applyBulto = (item: FacturaItem) => {
    const unidades = parseInt(bultoUnidades);
    const precioBulto = parseFloat(bultoPrecio);
    const bultos = parseFloat(bultoCantidad || '1');
    if (!(unidades > 0) || !(precioBulto > 0) || !(bultos > 0)) {
      setError('Completá unidades por bulto, precio del bulto y cantidad de bultos comprados');
      return;
    }
    const cantidadTotal = Math.round(bultos * unidades);
    const costoUnitario = parseFloat((precioBulto / unidades).toFixed(2));
    updateItemMutation.mutate({
      itemId: item.id,
      data: { cantidad: cantidadTotal, precioUnitario: costoUnitario, unidadesPorBulto: unidades },
    });

    // mantiene el % de ganancia actual, igual que al editar el costo a mano
    const product = item.product;
    const costoActual = Number(item.precioUnitario);
    if (product && costoActual > 0) {
      const currentPct = (Number(product.price) - costoActual) / costoActual;
      const newPrice = parseFloat((costoUnitario * (1 + currentPct)).toFixed(2));
      if (newPrice > 0) updateProductMutation.mutate({ productId: product.id, price: newPrice });
    }

    setBultoOpenId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number, field: Field) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (row > 0) focusCell(row - 1, field);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (row < items.length - 1) focusCell(row + 1, field);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      const idx = FIELDS.indexOf(field);
      if (idx < FIELDS.length - 1) focusCell(row, FIELDS[idx + 1]);
      else if (row < items.length - 1) focusCell(row + 1, FIELDS[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Cant.</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Costo</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Precio</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Ganancia</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Cód. artículo</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Subtotal</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  Sin productos todavía.
                </td>
              </tr>
            ) : (
              items.map((item, row) => {
                const product = item.product;
                const costo = Number(item.precioUnitario);
                const precio = product ? Number(product.price) : null;
                const pct = product && costo > 0 ? ((precio! - costo) / costo) * 100 : null;
                const busy = updateItemMutation.isPending || updateProductMutation.isPending;

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        {product && (
                          <div className="relative w-8 h-8 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <Image src={product.imageUrl} alt={product.title} fill sizes="32px" className="object-contain p-0.5" />
                          </div>
                        )}
                        <span className="font-semibold text-gray-700 truncate max-w-[160px]">
                          {product?.title ?? item.nombreDetectado}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        key={item.cantidad}
                        data-row={row}
                        data-field="cantidad"
                        type="number"
                        step="1"
                        min="1"
                        defaultValue={item.cantidad}
                        disabled={busy}
                        onKeyDown={(e) => handleKeyDown(e, row, 'cantidad')}
                        onBlur={(e) => {
                          const val = Math.round(parseFloat(e.target.value));
                          if (isNaN(val) || val < 1) { e.target.value = String(item.cantidad); return; }
                          if (val === item.cantidad) return;
                          updateItemMutation.mutate({ itemId: item.id, data: { cantidad: val } });
                        }}
                        className="w-16 font-semibold outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-500">$</span>
                        <input
                          key={item.precioUnitario}
                          data-row={row}
                          data-field="costo"
                          type="number"
                          step="0.01"
                          defaultValue={item.precioUnitario}
                          disabled={busy}
                          onKeyDown={(e) => handleKeyDown(e, row, 'costo')}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val < 0) { e.target.value = item.precioUnitario; return; }
                            if (val === costo) return;
                            updateItemMutation.mutate({ itemId: item.id, data: { precioUnitario: val } });
                            // mantiene el % de ganancia actual: recalcula el precio de venta
                            // para conservar el mismo margen contra el costo nuevo
                            if (product && costo > 0) {
                              const currentPct = (precio! - costo) / costo;
                              const newPrice = parseFloat((val * (1 + currentPct)).toFixed(2));
                              if (newPrice > 0) updateProductMutation.mutate({ productId: product.id, price: newPrice });
                            }
                          }}
                          className="w-20 font-bold text-gray-500 outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          title="Calcular por bulto/caja"
                          onClick={() => (bultoOpenId === item.id ? setBultoOpenId(null) : openBulto(item))}
                          className={`text-xs flex-shrink-0 rounded px-1 transition-colors ${
                            bultoOpenId === item.id ? 'bg-orange-100' : 'hover:bg-gray-100'
                          }`}
                        >
                          📦
                        </button>
                      </div>
                      {item.unidadesPorBultoDetectada != null && bultoOpenId !== item.id && (
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5 whitespace-nowrap">
                          {item.unidadesPorBultoDetectada} un./bulto
                        </p>
                      )}
                      {bultoOpenId === item.id && (
                        <div className="flex flex-col gap-1 mt-2 bg-gray-50 rounded-lg p-2 w-48">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Unidades por bulto
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            autoFocus
                            value={bultoUnidades}
                            onChange={(e) => setBultoUnidades(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400"
                          />
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Precio del bulto
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={bultoPrecio}
                            onChange={(e) => setBultoPrecio(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400"
                          />
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Bultos comprados
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={bultoCantidad}
                            onChange={(e) => setBultoCantidad(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400"
                          />
                          {parseFloat(bultoUnidades) > 0 && parseFloat(bultoPrecio) > 0 && (
                            <p className="text-[11px] font-semibold text-gray-500">
                              = {Math.round((parseFloat(bultoCantidad) || 1) * parseFloat(bultoUnidades))} un. a{' '}
                              {money(parseFloat(bultoPrecio) / parseFloat(bultoUnidades))} c/u
                            </p>
                          )}
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => setBultoOpenId(null)}
                              className="flex-1 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => applyBulto(item)}
                              className="flex-1 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-orange-500">$</span>
                          <input
                            key={product.price}
                            data-row={row}
                            data-field="precio"
                            type="number"
                            step="0.01"
                            defaultValue={product.price}
                            disabled={busy}
                            onKeyDown={(e) => handleKeyDown(e, row, 'precio')}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val) || val <= 0) { e.target.value = product.price; return; }
                              if (val === precio) return;
                              updateProductMutation.mutate({ productId: product.id, price: val });
                            }}
                            className="w-20 font-bold text-orange-500 outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product && (
                        <div className="flex items-center gap-0.5">
                          <input
                            key={`${item.precioUnitario}-${product.price}`}
                            data-row={row}
                            data-field="ganancia"
                            type="number"
                            step="0.1"
                            defaultValue={pct !== null ? pct.toFixed(1) : ''}
                            placeholder="—"
                            disabled={!costo || busy}
                            onKeyDown={(e) => handleKeyDown(e, row, 'ganancia')}
                            onBlur={(e) => {
                              if (!costo) return;
                              const raw = e.target.value;
                              const newPct = parseFloat(raw);
                              if (raw === '' || isNaN(newPct)) { e.target.value = pct !== null ? pct.toFixed(1) : ''; return; }
                              if (pct !== null && Math.abs(newPct - pct) < 0.05) return;
                              const newPrice = parseFloat((costo * (1 + newPct / 100)).toFixed(2));
                              if (newPrice <= 0) { e.target.value = pct !== null ? pct.toFixed(1) : ''; return; }
                              updateProductMutation.mutate({ productId: product.id, price: newPrice });
                            }}
                            className={`w-14 text-xs font-bold outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50 ${
                              pct === null ? 'text-gray-300' : pct >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-gray-300">%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        key={item.codigoArticuloDetectado ?? ''}
                        data-row={row}
                        data-field="codigoArticulo"
                        type="text"
                        defaultValue={item.codigoArticuloDetectado ?? ''}
                        disabled={busy}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                          handleKeyDown(e, row, 'codigoArticulo');
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val === (item.codigoArticuloDetectado ?? '')) return;
                          updateItemMutation.mutate({ itemId: item.id, data: { codigoArticulo: val || null } });
                        }}
                        placeholder="—"
                        className="w-full text-xs outline-none border-b border-transparent focus:border-orange-300 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{money(item.subtotal)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="px-4 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
