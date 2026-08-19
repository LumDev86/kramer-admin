'use client';

import { RefObject } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

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
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          ref={scanInputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onScanKeyDown}
          onFocus={onFocusScan}
          placeholder="Escaneá o tipeá el código y presioná Enter"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 font-semibold"
        />
        <button
          onClick={onOpenProductSearch}
          title="Buscar producto (F10)"
          className="flex-shrink-0 flex items-center gap-2 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MagnifyingGlass size={16} weight="bold" />
          <span className="hidden sm:inline">Buscar</span>
          <span className="hidden md:inline text-xs text-gray-400 font-medium">F10</span>
        </button>
        <button
          onClick={onOpenManual}
          className="flex-shrink-0 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Manual
        </button>
      </div>

      {scanError && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{scanError}</p>}

      {manualOpen && (
        <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Producto manual</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => onManualNameChange(e.target.value)}
              placeholder="Descripción"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={manualPrice}
              onChange={(e) => onManualPriceChange(e.target.value)}
              placeholder="Precio"
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancelManual}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onAddManual}
              disabled={!manualName.trim() || !manualPrice}
              className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
