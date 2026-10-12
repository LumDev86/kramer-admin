'use client';

import { Plus, X } from '@phosphor-icons/react';
import { Sale } from '@/lib/api';

interface Props {
  tickets: Sale[];
  activeSaleId: string | undefined;
  onSelect: (id: string) => void;
  onCancel: (sale: Sale) => void;
  onNew: () => void;
  creating: boolean;
}

export default function TicketsTabs({ tickets, activeSaleId, onSelect, onCancel, onNew, creating }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Tickets abiertos">
      {tickets.map((sale, i) => {
        const active = activeSaleId === sale.id;
        const count = sale.items.reduce((s, it) => s + it.quantity, 0);
        return (
          <div
            key={sale.id}
            className={`flex items-center rounded-xl border-[1.5px] text-sm font-extrabold transition-colors ${
              active ? 'bg-kr-navy border-kr-navy text-white' : 'bg-white border-kr-line text-kr-navy hover:border-kr-navy/40'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(sale.id)}
              className="flex min-h-10 items-center gap-2 pl-3.5 pr-1.5"
            >
              Ticket {i + 1}
              {count > 0 && <span className="rounded-lg bg-kr-yellow px-1.5 text-xs text-kr-navy">{count}</span>}
            </button>
            <button
              type="button"
              onClick={() => onCancel(sale)}
              aria-label={`Cancelar ticket ${i + 1}`}
              title="Cancelar ticket"
              className={`flex h-10 w-8 items-center justify-center rounded-r-xl ${
                active ? 'text-white/70 hover:text-white' : 'text-kr-muted hover:text-kr-orange-dark'
              }`}
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        disabled={creating}
        className="flex min-h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-kr-line bg-white/60 px-3.5 text-sm font-extrabold text-kr-muted hover:border-kr-navy/40 hover:text-kr-navy transition-colors disabled:opacity-60"
      >
        <Plus size={15} weight="bold" />
        Nuevo
      </button>
    </div>
  );
}
