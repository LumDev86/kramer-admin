'use client';

import { CurrentCashSession } from '@/lib/api';
import { money } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';

interface Props {
  session: CurrentCashSession;
  closingAmount: string;
  onClosingAmountChange: (v: string) => void;
  error: string;
  onConfirm: () => void;
  closing: boolean;
  onCancel: () => void;
}

export default function CerrarCajaModal({
  session,
  closingAmount,
  onClosingAmountChange,
  error,
  onConfirm,
  closing,
  onCancel,
}: Props) {
  const rows: [string, number | string][] = [
    ['Inicial', session.openingAmount],
    ['Ventas en efectivo', session.salesCash],
    ['Ventas a crédito', session.salesCredit],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kr-navy/50 px-4 animate-fadeIn">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Cerrar caja"
        onSubmit={(e) => { e.preventDefault(); if (closingAmount && !closing) onConfirm(); }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-kr-navy bg-white p-5 shadow-pop-lg animate-slideUp"
      >
        <p className="font-display text-2xl leading-none">Cerrar caja</p>
        <dl className="flex flex-col gap-1.5 rounded-xl bg-kr-paper p-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="font-bold text-kr-muted">{label}</dt>
              <dd className="font-extrabold tabular-nums">{money(value)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-kr-line pt-1.5">
            <dt className="font-extrabold">Esperado en caja</dt>
            <dd className="font-extrabold tabular-nums">{money(Number(session.openingAmount) + session.salesCash)}</dd>
          </div>
        </dl>
        <label className="flex flex-col gap-1.5 text-sm font-extrabold text-kr-muted">
          Efectivo contado
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            value={closingAmount}
            onChange={(e) => onClosingAmountChange(e.target.value)}
            placeholder="$0"
            className="rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 py-2.5 text-lg font-extrabold text-kr-navy tabular-nums outline-none focus:border-kr-blue"
          />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={buttonClasses('secondary', 'md', 'flex-1')}>
            Cancelar
          </button>
          <button type="submit" disabled={!closingAmount || closing} className={buttonClasses('primary', 'md', 'flex-1')}>
            {closing ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </form>
    </div>
  );
}
