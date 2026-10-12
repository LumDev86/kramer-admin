'use client';

import { RefObject } from 'react';
import { Barcode, MagnifyingGlass, PencilSimple } from '@phosphor-icons/react';
import { buttonClasses } from '@/components/ui/Button';

interface Props {
  scanInputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (v: string) => void;
  onScanKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocusScan: () => void;
  onOpenProductSearch: () => void;
  scanError: string;
  manualOpen: boolean;
  onOpenManual: () => void;
  manualName: string;
  onManualNameChange: (v: string) => void;
  manualPrice: string;
  onManualPriceChange: (v: string) => void;
  onCancelManual: () => void;
  onAddManual: () => void;
}

const inputCls =
  'min-w-0 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 py-2.5 text-base font-bold text-kr-navy outline-none focus:border-kr-blue';

export default function EscaneoYManualCard({
  scanInputRef,
  query,
  onQueryChange,
  onScanKeyDown,
  onFocusScan,
  onOpenProductSearch,
  scanError,
  manualOpen,
  onOpenManual,
  manualName,
  onManualNameChange,
  manualPrice,
  onManualPriceChange,
  onCancelManual,
  onAddManual,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-kr-blue bg-white p-1.5 pl-3.5 focus-within:shadow-[0_0_0_3px_#EAF1FB]">
        <Barcode size={24} className="flex-shrink-0 text-kr-blue" />
        <input
          ref={scanInputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onScanKeyDown}
          onFocus={onFocusScan}
          aria-label="Código de barras"
          placeholder="Escaneá o escribí el código y Enter"
          className="min-h-10 min-w-[140px] flex-1 bg-transparent text-base font-bold text-kr-navy outline-none placeholder:text-kr-muted/70"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onOpenProductSearch}
            title="Buscar producto por nombre (F10)"
            className={buttonClasses('secondary', 'sm', 'border-kr-blue text-kr-blue min-h-10')}
          >
            <MagnifyingGlass size={16} weight="bold" />
            Buscar
            <kbd className="hidden md:inline font-sans text-[11px] opacity-70">F10</kbd>
          </button>
          <button
            type="button"
            onClick={onOpenManual}
            title="Agregar un producto que no está cargado"
            className={buttonClasses('secondary', 'sm', 'min-h-10')}
          >
            <PencilSimple size={16} weight="bold" />
            Manual
          </button>
        </div>
      </div>

      {scanError && (
        <p role="alert" className="rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">
          {scanError}
        </p>
      )}

      {manualOpen && (
        <div className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-dashed border-kr-line bg-white p-3 animate-fadeIn">
          <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Producto manual</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              autoFocus
              value={manualName}
              onChange={(e) => onManualNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddManual(); } }}
              placeholder="Descripción"
              aria-label="Descripción"
              className={`${inputCls} flex-1`}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={manualPrice}
              onChange={(e) => onManualPriceChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddManual(); } }}
              placeholder="Precio"
              aria-label="Precio"
              className={`${inputCls} sm:w-36 text-right tabular-nums`}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancelManual} className={buttonClasses('secondary', 'md', 'flex-1')}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={onAddManual}
              disabled={!manualName.trim() || !manualPrice}
              className={buttonClasses('primary', 'md', 'flex-1')}
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
