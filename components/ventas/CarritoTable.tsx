'use client';

import { RefObject } from 'react';
import { Minus, Plus, X } from '@phosphor-icons/react';
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

// columnas: el producto se lleva todo el ancho que sobra (el nombre nunca se recorta, puede
// ocupar dos líneas); cantidad, precio y subtotal van angostas y alineadas a la derecha.
// En el celular cada fila se arma en dos renglones: nombre arriba, cantidad y subtotal abajo.
const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_124px_92px_104px_40px] items-center gap-x-3 gap-y-2';

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
  const items = activeSale?.items ?? [];
  const focused = section === 'cart';

  return (
    <div
      ref={cartContainerRef}
      tabIndex={-1}
      onFocus={onFocusCart}
      aria-label="Carrito"
      className={`overflow-hidden rounded-2xl border bg-white outline-none transition-shadow ${
        focused ? 'border-kr-navy shadow-[0_0_0_3px_#FFC61A]' : 'border-kr-line'
      }`}
    >
      <div className={`${GRID} hidden sm:grid border-b border-kr-line bg-kr-paper px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-kr-muted`}>
        <span>Producto</span>
        <span className="text-center">Cant.</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
          Sin productos todavía. Escaneá o buscá uno para empezar.
        </p>
      ) : (
        <ul>
          {items.map((item, i) => {
            const selected = focused && i === cartIndex;
            return (
              <li
                key={item.id}
                onMouseEnter={() => onHoverItem(i)}
                className={`${GRID} border-b border-dashed border-kr-line px-3 py-3 last:border-b-0 sm:px-4 sm:py-2.5 transition-colors ${
                  selected ? 'bg-kr-yellow-soft shadow-[inset_4px_0_0_#F26B1D]' : 'hover:bg-kr-paper'
                }`}
              >
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <p className="text-[15px] font-extrabold leading-snug break-words">{item.name}</p>
                  <p className="mt-0.5 text-xs font-bold text-kr-muted sm:hidden">{money(item.unitPrice)} c/u</p>
                  {!item.productId && <p className="mt-0.5 text-xs font-bold text-kr-muted">Producto manual</p>}
                </div>

                <div className="flex items-center gap-2 sm:justify-center">
                  <div className="inline-flex items-center overflow-hidden rounded-xl border-[1.5px] border-kr-line bg-white">
                    <button
                      type="button"
                      onClick={() => onDecrement(item)}
                      disabled={item.quantity <= 1}
                      aria-label={`Restar uno de ${item.name}`}
                      className="flex h-10 w-10 items-center justify-center text-kr-navy hover:bg-kr-sand disabled:opacity-30"
                    >
                      <Minus size={16} weight="bold" />
                    </button>
                    <span className="min-w-8 text-center font-extrabold tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onIncrement(item)}
                      aria-label={`Sumar uno de ${item.name}`}
                      className="flex h-10 w-10 items-center justify-center text-kr-navy hover:bg-kr-sand"
                    >
                      <Plus size={16} weight="bold" />
                    </button>
                  </div>
                  {/* en el celular el botón de quitar va al lado de la cantidad */}
                  <RemoveButton item={item} onRemove={onRemove} className="flex sm:hidden" />
                </div>

                <span className="hidden sm:block text-right text-sm font-bold text-kr-muted tabular-nums whitespace-nowrap">
                  {money(item.unitPrice)}
                </span>
                <span className="text-right text-base font-extrabold tabular-nums whitespace-nowrap">{money(item.subtotal)}</span>
                <RemoveButton item={item} onRemove={onRemove} className="hidden sm:flex" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RemoveButton({ item, onRemove, className }: { item: SaleItem; onRemove: (item: SaleItem) => void; className: string }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item)}
      aria-label={`Quitar ${item.name}`}
      title="Quitar (Supr)"
      className={`h-10 w-10 items-center justify-center rounded-[10px] text-kr-muted hover:bg-[#FFE7D6] hover:text-kr-orange-dark transition-colors ${className}`}
    >
      <X size={18} weight="bold" />
    </button>
  );
}
