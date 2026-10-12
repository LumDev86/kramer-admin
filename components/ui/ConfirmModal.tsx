'use client';

import { Warning } from '@phosphor-icons/react';
import { buttonClasses } from './Button';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export default function ConfirmModal({ message, onConfirm, onCancel, loading, error }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kr-navy/50 px-4 animate-fadeIn">
      <div role="alertdialog" aria-modal="true" aria-label={message} className="bg-white rounded-2xl border-2 border-kr-navy shadow-pop-lg p-6 w-full max-w-sm animate-slideUp">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-[#FFE7D6] rounded-full flex items-center justify-center">
            <Warning size={24} weight="fill" className="text-kr-orange-dark" />
          </div>
          <p className="text-base font-extrabold text-kr-navy">{message}</p>
          {error && (
            <p className="text-sm text-kr-orange-dark font-bold bg-[#FFE7D6] rounded-lg px-3 py-2 w-full">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className={buttonClasses('secondary', 'md', 'flex-1')}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 min-h-11 rounded-xl bg-kr-orange-dark hover:bg-[#A8380A] text-white text-sm font-extrabold border-2 border-kr-navy transition-colors disabled:opacity-60"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
