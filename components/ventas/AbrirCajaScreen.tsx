'use client';

import { Wallet } from '@phosphor-icons/react';
import { CashSession, CashSessionBreakdown } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
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
      <PageHeader title="Ventas" subtitle="Abrí la caja para empezar a vender" />
      <form
        onSubmit={(e) => { e.preventDefault(); if (openingAmount && !opening) onOpen(); }}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 border-kr-navy bg-white p-5 shadow-pop-lg"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-kr-yellow-soft">
            <Wallet size={22} weight="fill" className="text-kr-orange-dark" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight">Abrir caja</p>
            <p className="text-sm font-bold text-kr-muted">Ingresá el efectivo con el que arrancás el turno</p>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-extrabold text-kr-muted">
          Monto inicial en efectivo
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            value={openingAmount}
            onChange={(e) => onOpeningAmountChange(e.target.value)}
            placeholder="$0"
            className="rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-4 py-3 text-xl font-extrabold text-kr-navy tabular-nums outline-none focus:border-kr-blue"
          />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
        <button type="submit" disabled={!openingAmount || opening} className={buttonClasses('primary', 'lg', 'w-full')}>
          {opening ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </form>
      {closeModalOpen && closeResult && (
        <CierreCajaResultModal result={closeResult} breakdown={closeBreakdown} onAccept={onAcceptCloseResult} />
      )}
    </>
  );
}
