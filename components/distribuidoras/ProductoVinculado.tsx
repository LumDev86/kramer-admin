'use client';

import { useState } from 'react';
import { Check, X } from '@phosphor-icons/react';
import { FacturaItem } from '@/lib/api';
import { money } from '@/lib/format';

type ItemConProducto = FacturaItem & { product: NonNullable<FacturaItem['product']> };

const getPriceChange = (item: FacturaItem): { pct: number; oldCost: number; newCost: number } | null => {
  if (!item.product?.cost) return null;
  const oldCost = Number(item.product.cost);
  const newCost = Number(item.precioUnitario);
  if (!(oldCost > 0) || Math.abs(newCost - oldCost) < 0.01) return null;
  return { pct: ((newCost - oldCost) / oldCost) * 100, oldCost, newCost };
};

interface Props {
  item: ItemConProducto;
  onDesvincular: () => void;
  onActualizarPrecio: (price: number) => void;
  actualizandoPrecio: boolean;
  error?: string;
}

export default function ProductoVinculado({ item, onDesvincular, onActualizarPrecio, actualizandoPrecio, error }: Props) {
  const [priceDraft, setPriceDraft] = useState<string | null>(null);
  const [pctDraft, setPctDraft] = useState<string | null>(null);
  const change = getPriceChange(item);
  const subiendo = !!change && change.pct > 0;
  // margen actual (con el precio de venta de hoy contra el costo nuevo de esta factura) - se
  // usa solo como placeholder, para que el input de % arranque mostrando dónde está parado
  // el margen antes de que el usuario toque nada
  const margenActualPct = change ? ((Number(item.product.price) - change.newCost) / change.newCost) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-1.5">
        <Check size={12} weight="bold" className="text-green-500" />
        <span className="text-xs text-green-600 font-semibold">{item.product.title}</span>
        <button onClick={onDesvincular} className="text-gray-300 hover:text-red-500">
          <X size={12} weight="bold" />
        </button>
      </div>
      {change && (
        <div className="flex flex-col gap-1">
          <p className={`text-[11px] font-bold ${subiendo ? 'text-red-500' : 'text-green-600'}`}>
            {subiendo ? '⬆' : '⬇'} {subiendo ? 'Aumentó' : 'Bajó'} {Math.abs(change.pct).toFixed(1)}%
            {' '}respecto a la última factura ({money(change.oldCost)} → {money(change.newCost)})
          </p>
          {subiendo && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                Precio de venta actual: {money(item.product.price)}
              </span>
              <input
                type="number"
                step="0.1"
                title="Margen de ganancia deseado sobre el costo nuevo de esta factura"
                placeholder={`${margenActualPct.toFixed(0)}%`}
                value={pctDraft ?? ''}
                onChange={(e) => {
                  setPctDraft(e.target.value);
                  const pct = parseFloat(e.target.value);
                  if (!isNaN(pct) && change) setPriceDraft((change.newCost * (1 + pct / 100)).toFixed(2));
                }}
                className="w-14 text-[11px] font-semibold border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:border-orange-400"
              />
              <span className="text-[11px] text-gray-400">% →</span>
              <input
                type="number"
                step="0.01"
                value={priceDraft ?? item.product.price}
                onChange={(e) => { setPriceDraft(e.target.value); setPctDraft(null); }}
                className="w-20 text-[11px] font-semibold border border-gray-200 rounded-lg px-1.5 py-0.5 outline-none focus:border-orange-400"
              />
              <button
                onClick={() => {
                  const raw = priceDraft ?? item.product.price;
                  const newPrice = parseFloat(raw);
                  if (!isNaN(newPrice) && newPrice > 0) onActualizarPrecio(newPrice);
                }}
                disabled={actualizandoPrecio}
                className="text-[11px] font-bold text-orange-500 hover:text-orange-600 whitespace-nowrap disabled:opacity-50"
              >
                Actualizar precio
              </button>
              {error && <p className="w-full text-[11px] font-semibold text-red-500">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
