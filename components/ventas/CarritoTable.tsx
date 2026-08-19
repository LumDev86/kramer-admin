'use client';

import { RefObject } from 'react';
import { Trash } from '@phosphor-icons/react';
import { Sale, SaleItem } from '@/lib/api';
import { money } from '@/lib/format';
import { Section } from './types';

interface Props {
  cartContainerRef: RefObject<HTMLDivElement | null>;
  section: Section;
  onFocusCart: () => void;
  activeSale: Sale | null;
  cartIndex: number;
  onHoverItem: (i: number) => void;
  onIncrement: (item: SaleItem) => void;
  onDecrement: (item: SaleItem) => void;
  onRemove: (item: SaleItem) => void;
}

export default function CarritoTable({
  cartContainerRef,
  section,
  onFocusCart,
  activeSale,
  cartIndex,
  onHoverItem,
  onIncrement,
  onDecrement,
  onRemove,
}: Props) {
  return (
    <div
      ref={cartContainerRef}
      tabIndex={-1}
      onFocus={onFocusCart}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden outline-none transition-shadow ${
        section === 'cart' ? 'ring-2 ring-orange-400' : ''
      }`}
    >
      {!!activeSale && activeSale.items.length > 0 && (
        <p className="px-4 py-2 text-[11px] text-gray-400 font-medium border-b border-gray-50">
          Tab cambia de sección · acá: ↑↓ elegir producto · +/− cantidad · Supr eliminar
        </p>
      )}
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-32">Cantidad</th>
            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Subtotal</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {!activeSale || activeSale.items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                Sin productos todavía. Escaneá o buscá uno para empezar.
              </td>
            </tr>
          ) : (
            activeSale.items.map((item, i) => (
              <tr
                key={item.id}
                onMouseEnter={() => onHoverItem(i)}
                className={`transition-colors ${
                  section === 'cart' && i === cartIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-700">{item.name}</p>
                  <p className="text-xs text-gray-400">{money(item.unitPrice)} c/u</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDecrement(item)}
                      className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => onIncrement(item)}
                      className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold text-orange-500">{money(item.subtotal)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onRemove(item)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
