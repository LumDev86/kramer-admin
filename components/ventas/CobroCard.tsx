'use client';

import { RefObject } from 'react';
import { Cliente, PaymentMethod } from '@/lib/api';
import { money } from '@/lib/format';
import { Section } from './types';

interface Props {
  section: Section;
  total: number;
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

export default function CobroCard({
  section,
  total,
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
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4 transition-shadow ${
        section === 'payment' ? 'ring-2 ring-orange-400' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total</p>
        <p className="text-2xl font-extrabold text-gray-800">{money(total)}</p>
      </div>

      <div className="flex gap-2">
        <button
          ref={efectivoBtnRef}
          onClick={onClickEfectivo}
          onFocus={onFocusPayment}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors outline-none focus:ring-2 focus:ring-orange-300 ${
            paymentMethod === 'CASH' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          Efectivo <span className="opacity-60 font-medium">· F2</span>
        </button>
        <button
          ref={creditoBtnRef}
          onClick={onClickCredito}
          onFocus={onFocusPayment}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors outline-none focus:ring-2 focus:ring-orange-300 ${
            paymentMethod === 'CREDIT' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          Crédito <span className="opacity-60 font-medium">· F1</span>
        </button>
      </div>

      {paymentMethod === 'CREDIT' && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-sm font-semibold text-gray-700 truncate">
            {selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido}` : 'Sin cliente seleccionado'}
          </p>
          <button
            onClick={onOpenClienteSearch}
            className="flex-shrink-0 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
          >
            {selectedCliente ? 'Cambiar' : 'Elegir cliente'}
          </button>
        </div>
      )}

      {paymentMethod === 'CASH' && (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(e.target.value)}
            placeholder="Paga con... (opcional)"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <p className={`text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-gray-300'}`}>
            Vuelto: {paidAmount !== '' && change >= 0 ? money(change) : '—'}
          </p>
        </div>
      )}

      {payError && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{payError}</p>}

      <button
        ref={payButtonRef}
        onClick={onPay}
        onFocus={onFocusConfirm}
        disabled={!canPay || paying}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold transition-colors disabled:opacity-50 outline-none focus:ring-2 focus:ring-green-300"
      >
        {paying
          ? 'Cobrando...'
          : paymentMethod === 'CREDIT' && !selectedCliente
          ? 'F1 · Elegir cliente'
          : paymentMethod === 'CREDIT'
          ? `F2 · Cobrar ${money(total)} a crédito`
          : `F2 · Cobrar ${money(total)} en efectivo`}
      </button>
    </div>
  );
}
