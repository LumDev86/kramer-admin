'use client';

import { CurrentCashSession } from '@/lib/api';
import { money } from '@/lib/format';

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-slideUp flex flex-col gap-4">
        <p className="text-sm font-bold text-gray-700">Cerrar caja</p>
        <div className="flex flex-col gap-1.5 text-sm bg-gray-50 rounded-xl p-3">
          <div className="flex justify-between"><span className="text-gray-500">Inicial</span><span className="font-semibold">{money(session.openingAmount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Ventas efectivo</span><span className="font-semibold">{money(session.salesCash)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Ventas a crédito</span><span className="font-semibold">{money(session.salesCredit)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="text-gray-500">Esperado</span><span className="font-bold">{money(Number(session.openingAmount) + session.salesCash)}</span></div>
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={closingAmount}
          onChange={(e) => onClosingAmountChange(e.target.value)}
          placeholder="Monto contado"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-semibold"
        />
        {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!closingAmount || closing}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {closing ? 'Cerrando...' : 'Confirmar cierre'}
          </button>
        </div>
      </div>
    </div>
  );
}
