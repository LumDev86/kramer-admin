'use client';

import { Warning } from '@phosphor-icons/react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export default function ConfirmModal({ message, onConfirm, onCancel, loading, error }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-slideUp">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Warning size={24} weight="fill" className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">{message}</p>
          {error && (
            <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
