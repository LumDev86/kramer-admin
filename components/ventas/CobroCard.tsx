'use client';

import { RefObject } from 'react';
import { UserCircle } from '@phosphor-icons/react';
import { Cliente, PaymentMethod } from '@/lib/api';
import { money } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';
import { Section } from './types';

interface Props {
  section: Section;
  total: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  onClickEfectivo: () => void;
  onClickCredito: () => void;
  onFocusPayment: () => void;
  selectedCliente: Cliente | null;
  onOpenClienteSearch: () => void;
  paidAmount: string;
  onPaidAmountChange: (v: string) => void;
  change: number;
  payError: string;
  onPay: () => void;
  canPay: boolean;
  paying: boolean;
  onFocusConfirm: () => void;
  efectivoBtnRef: RefObject<HTMLButtonElement | null>;
  creditoBtnRef: RefObject<HTMLButtonElement | null>;
  payButtonRef: RefObject<HTMLButtonElement | null>;
}

// billetes "redondos" por encima del total, para cargar el "paga con" de un toque
function montosRapidos(total: number): number[] {
  const out: number[] = [];
  for (const step of [1000, 5000, 10000, 20000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 3);
}

export default function CobroCard({
  section,
  total,
  itemCount,
  paymentMethod,
  onClickEfectivo,
  onClickCredito,
  onFocusPayment,
  selectedCliente,
  onOpenClienteSearch,
  paidAmount,
  onPaidAmountChange,
  change,
  payError,
  onPay,
  canPay,
  paying,
  onFocusConfirm,
  efectivoBtnRef,
  creditoBtnRef,
  payButtonRef,
}: Props) {
  const isCash = paymentMethod === 'CASH';
  const methodCls = (on: boolean) =>
    `flex min-h-12 flex-col items-center justify-center rounded-xl text-sm font-extrabold leading-tight outline-none transition-colors focus-visible:shadow-[0_0_0_3px_#FFC61A] ${
      on ? 'bg-kr-yellow-soft border-2 border-kr-navy shadow-pop-sm' : 'bg-white border-[1.5px] border-kr-line hover:border-kr-navy/40'
    }`;

  return (
    // menos de xl: queda fija abajo de la pantalla y se arma en dos columnas para ocupar poca
    // altura; en xl va en su propia columna a la derecha del carrito
    <section
      aria-label="Cobro"
      className={`grid grid-cols-2 items-end gap-x-3 gap-y-2.5 rounded-2xl border-2 border-kr-navy bg-white p-3 shadow-pop-lg sm:p-4 xl:flex xl:flex-col xl:items-stretch xl:gap-4 xl:p-5 ${
        section === 'payment' ? 'outline outline-3 outline-kr-yellow' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">
          Total · {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
        </p>
        <p className="font-display text-[34px] leading-none tabular-nums sm:text-[40px] xl:text-5xl">{money(total)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button ref={efectivoBtnRef} type="button" onClick={onClickEfectivo} onFocus={onFocusPayment} aria-pressed={isCash} className={methodCls(isCash)}>
          Efectivo
          <small className="text-[11px] font-bold text-kr-muted">F2</small>
        </button>
        <button ref={creditoBtnRef} type="button" onClick={onClickCredito} onFocus={onFocusPayment} aria-pressed={!isCash} className={methodCls(!isCash)}>
          Crédito
          <small className="text-[11px] font-bold text-kr-muted">F1</small>
        </button>
      </div>

      {isCash && (
        <>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-extrabold text-kr-muted">
            Paga con (opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={paidAmount}
              onChange={(e) => onPaidAmountChange(e.target.value)}
              placeholder="Justo"
              className="min-w-0 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 py-2 text-lg font-extrabold text-kr-navy tabular-nums outline-none focus:border-kr-blue xl:text-xl"
            />
          </label>
          <div
            className={`flex min-h-[46px] items-baseline justify-between gap-2 rounded-xl px-3 py-2 font-extrabold ${
              paidAmount !== '' && change < 0 ? 'bg-[#FFE7D6] text-kr-orange-dark' : 'bg-kr-green-soft text-kr-green-dark'
            }`}
          >
            <span className="text-sm">{paidAmount !== '' && change < 0 ? 'Falta' : 'Vuelto'}</span>
            <b className="font-display text-2xl font-normal tabular-nums">
              {paidAmount === '' ? '—' : money(Math.abs(change))}
            </b>
          </div>
          <div className="col-span-2 hidden flex-wrap gap-1.5 sm:flex">
            <button type="button" onClick={() => onPaidAmountChange('')} className={buttonClasses('secondary', 'sm')}>
              Justo
            </button>
            {montosRapidos(total).map((v) => (
              <button key={v} type="button" onClick={() => onPaidAmountChange(String(v))} className={buttonClasses('secondary', 'sm', 'tabular-nums')}>
                {money(v)}
              </button>
            ))}
          </div>
        </>
      )}

      {!isCash && (
        <button
          type="button"
          onClick={onOpenClienteSearch}
          className={`col-span-2 flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2 text-left font-extrabold ${
            selectedCliente
              ? 'border-[1.5px] border-kr-line bg-kr-paper text-kr-navy'
              : 'border-[1.5px] border-dashed border-kr-blue bg-kr-blue-soft text-kr-blue'
          }`}
        >
          <UserCircle size={24} weight={selectedCliente ? 'fill' : 'regular'} className="flex-shrink-0" />
          <span className="min-w-0 flex-1 break-words">
            {selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido}` : 'Elegir cliente'}
          </span>
          {selectedCliente && <span className="text-xs text-kr-blue">Cambiar</span>}
        </button>
      )}

      {payError && (
        <p role="alert" className="col-span-2 rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">
          {payError}
        </p>
      )}

      <button
        ref={payButtonRef}
        type="button"
        onClick={onPay}
        onFocus={onFocusConfirm}
        disabled={!canPay || paying}
        className={buttonClasses('success', 'lg', 'col-span-2 w-full min-h-13 text-lg outline-none focus-visible:shadow-[0_0_0_3px_#FFC61A]')}
      >
        {paying
          ? 'Cobrando...'
          : !isCash && !selectedCliente
          ? 'Elegí un cliente (F1)'
          : <>Cobrar {money(total)} {isCash ? 'en efectivo' : 'a crédito'} <kbd className="hidden sm:inline font-sans text-xs opacity-70">F2</kbd></>}
      </button>
    </section>
  );
}
