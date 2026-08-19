'use client';

import { Check, WhatsappLogo, X } from '@phosphor-icons/react';
import { sales } from '@/lib/api';
import { money, waLink } from '@/lib/format';

interface Props {
  lastPaidSale: { id: string; total: string; telefonoSugerido: string };
  sendWaOpen: boolean;
  waPhone: string;
  onWaPhoneChange: (v: string) => void;
  onOpenSendWa: () => void;
  onDismiss: () => void;
}

export default function VentaCobradaCard({
  lastPaidSale,
  sendWaOpen,
  waPhone,
  onWaPhoneChange,
  onOpenSendWa,
  onDismiss,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check size={16} weight="bold" className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Venta cobrada</p>
            <p className="text-xs text-gray-400">{money(lastPaidSale.total)}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} weight="bold" />
        </button>
      </div>

      {!sendWaOpen ? (
        <button
          onClick={onOpenSendWa}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white text-sm font-bold transition-opacity"
        >
          <WhatsappLogo size={16} weight="fill" />
          Enviar ticket por WhatsApp
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="tel"
            autoFocus
            value={waPhone}
            onChange={(e) => onWaPhoneChange(e.target.value)}
            placeholder="+54 9 11 1234-5678"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <a
            href={
              waPhone.trim()
                ? waLink(waPhone, `¡Hola! Acá tenés tu ticket de compra: ${sales.ticketPdfUrl(lastPaidSale.id)}`)
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDismiss}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              waPhone.trim() ? 'bg-[#25D366] hover:opacity-90 text-white' : 'bg-gray-100 text-gray-300 pointer-events-none'
            }`}
          >
            Enviar
          </a>
        </div>
      )}
    </div>
  );
}
