'use client';

import { Plus, Receipt, X } from '@phosphor-icons/react';
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {tickets.map((sale, i) => (
        <div key={sale.id} className="relative flex-shrink-0">
          <button
            onClick={() => onSelect(sale.id)}
            className={`flex items-center gap-2 pl-4 pr-8 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeSaleId === sale.id
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Receipt size={16} weight={activeSaleId === sale.id ? 'fill' : 'regular'} />
            Ticket {i + 1}
          </button>
          <button
            onClick={() => onCancel(sale)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded ${
              activeSaleId === sale.id ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      ))}
      <button
        onClick={onNew}
        disabled={creating}
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        <Plus size={16} weight="bold" />
        Nuevo ticket
      </button>
    </div>
  );
}
