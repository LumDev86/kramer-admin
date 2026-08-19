'use client';

import { Check } from '@phosphor-icons/react';
import { CashSession, CashSessionBreakdown } from '@/lib/api';
import { money } from '@/lib/format';

interface Props {
  result: CashSession;
  breakdown: CashSessionBreakdown | undefined;
  onAccept: () => void;
}

export default function CierreCajaResultModal({ result, breakdown, onAccept }: Props) {
  const diff = Number(result.difference);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-slideUp flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              diff === 0 ? 'bg-green-100' : diff < 0 ? 'bg-red-100' : 'bg-amber-100'
            }`}
          >
            <Check size={24} weight="bold" className={diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <p className="text-sm font-bold text-gray-700">Caja cerrada</p>
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Esperado</span><span className="font-semibold">{money(result.expectedAmount!)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Contado</span><span className="font-semibold">{money(result.closingAmount!)}</span></div>
          <div className="flex justify-between border-t border-gray-100 pt-1.5">
            <span className="text-gray-500">Diferencia</span>
            <span className={`font-bold ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>
              {diff > 0 ? '+' : ''}{money(result.difference!)}
              {diff < 0 ? ' (faltante)' : diff > 0 ? ' (sobrante)' : ''}
            </span>
          </div>
          {breakdown && (
            <div className="flex justify-between border-t border-gray-100 pt-1.5">
              <span className="text-gray-500">Ganancia del turno</span>
              <span className="font-bold text-gray-700">{money(breakdown.profit)}</span>
            </div>
          )}
        </div>
        {breakdown && breakdown.byCategory.length > 0 && (
          <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas por categoría</p>
            {breakdown.byCategory.map((c) => (
              <div key={c.name} className="flex justify-between text-xs">
                <span className="text-gray-500">{c.name}</span>
                <span className="font-semibold text-gray-600">{money(c.total)}</span>
              </div>
            ))}
          </div>
        )}
        {breakdown && breakdown.byProduct.length > 0 && (
          <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Productos más vendidos</p>
            {breakdown.byProduct.map((p) => (
              <div key={p.name} className="flex justify-between text-xs">
                <span className="text-gray-500">{p.quantity} × {p.name}</span>
                <span className="font-semibold text-gray-600">{money(p.total)}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onAccept}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
