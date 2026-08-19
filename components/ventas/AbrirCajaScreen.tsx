'use client';

import { Wallet } from '@phosphor-icons/react';
import { CashSession, CashSessionBreakdown } from '@/lib/api';
import CierreCajaResultModal from './CierreCajaResultModal';

interface Props {
  openingAmount: string;
  onOpeningAmountChange: (v: string) => void;
  error: string;
  onOpen: () => void;
  opening: boolean;
  closeModalOpen: boolean;
  closeResult: CashSession | null;
  closeBreakdown: CashSessionBreakdown | undefined;
  onAcceptCloseResult: () => void;
}

export default function AbrirCajaScreen({
  openingAmount,
  onOpeningAmountChange,
  error,
  onOpen,
  opening,
  closeModalOpen,
  closeResult,
  closeBreakdown,
  onAcceptCloseResult,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-6 max-w-md">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Ventas</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Abrí la caja para empezar a vender</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Wallet size={20} weight="fill" className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Abrir caja</p>
              <p className="text-xs text-gray-400">Ingresá el efectivo con el que arrancás el turno</p>
            </div>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingAmount}
            onChange={(e) => onOpeningAmountChange(e.target.value)}
            placeholder="Monto inicial en efectivo"
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 font-semibold"
          />
          {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            onClick={onOpen}
            disabled={!openingAmount || opening}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-extrabold transition-colors disabled:opacity-50"
          >
            {opening ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </div>
      {closeModalOpen && closeResult && (
        <CierreCajaResultModal result={closeResult} breakdown={closeBreakdown} onAccept={onAcceptCloseResult} />
      )}
    </>
  );
}
