'use client';

import { Check } from '@phosphor-icons/react';
import { CashSession, CashSessionBreakdown } from '@/lib/api';
import { money } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';

interface Props {
  result: CashSession;
  breakdown: CashSessionBreakdown | undefined;
  onAccept: () => void;
}

export default function CierreCajaResultModal({ result, breakdown, onAccept }: Props) {
  const diff = Number(result.difference);
  const tone = diff === 0 ? 'text-kr-green-dark' : diff < 0 ? 'text-kr-orange-dark' : 'text-[#8A5A00]';
  const bg = diff === 0 ? 'bg-kr-green' : diff < 0 ? 'bg-[#FFE7D6]' : 'bg-kr-yellow';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kr-navy/50 px-4 animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Caja cerrada"
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl border-2 border-kr-navy bg-white p-5 shadow-pop-lg animate-slideUp"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-kr-navy ${bg}`}>
            <Check size={24} weight="bold" className="text-kr-navy" />
          </span>
          <p className="font-display text-2xl leading-none">Caja cerrada</p>
        </div>
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-3"><dt className="font-bold text-kr-muted">Esperado</dt><dd className="font-extrabold tabular-nums">{money(result.expectedAmount!)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-bold text-kr-muted">Contado</dt><dd className="font-extrabold tabular-nums">{money(result.closingAmount!)}</dd></div>
          <div className="flex justify-between gap-3 border-t border-kr-line pt-1.5">
            <dt className="font-bold text-kr-muted">Diferencia</dt>
            <dd className={`text-right font-extrabold tabular-nums ${tone}`}>
              {diff > 0 ? '+' : ''}{money(result.difference!)}
              {diff < 0 ? ' (faltante)' : diff > 0 ? ' (sobrante)' : ''}
            </dd>
          </div>
          {breakdown && (
            <div className="flex justify-between gap-3 border-t border-kr-line pt-1.5">
              <dt className="font-bold text-kr-muted">Ganancia del turno</dt>
              <dd className="font-extrabold tabular-nums">{money(breakdown.profit)}</dd>
            </div>
          )}
        </dl>
        {breakdown && breakdown.byCategory.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl bg-kr-paper p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Ventas por categoría</p>
            {breakdown.byCategory.map((c) => (
              <div key={c.name} className="flex justify-between gap-3 text-sm">
                <span className="font-bold">{c.name}</span>
                <span className="font-extrabold tabular-nums whitespace-nowrap">{money(c.total)}</span>
              </div>
            ))}
          </div>
        )}
        {breakdown && breakdown.byProduct.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl bg-kr-paper p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Productos más vendidos</p>
            {breakdown.byProduct.map((p) => (
              <div key={p.name} className="flex justify-between gap-3 text-sm">
                <span className="font-bold">{p.quantity} × {p.name}</span>
                <span className="font-extrabold tabular-nums whitespace-nowrap">{money(p.total)}</span>
              </div>
            ))}
          </div>
        )}
        <button type="button" autoFocus onClick={onAccept} className={buttonClasses('primary', 'md', 'w-full')}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
