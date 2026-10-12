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
    <section aria-label="Venta cobrada" className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-kr-green-dark/30 bg-kr-green-soft p-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-kr-navy bg-kr-green">
          <Check size={20} weight="bold" className="text-kr-navy" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-kr-green-dark">Venta cobrada</p>
          <p className="font-display text-2xl leading-none tabular-nums">{money(lastPaidSale.total)}</p>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="flex h-10 w-10 items-center justify-center rounded-xl text-kr-muted hover:bg-white/60 hover:text-kr-navy">
          <X size={18} weight="bold" />
        </button>
      </div>

      {!sendWaOpen ? (
        <button
          type="button"
          onClick={onOpenSendWa}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1EA952] px-4 text-sm font-extrabold text-white hover:bg-[#178A43] transition-colors"
        >
          <WhatsappLogo size={18} weight="fill" />
          Enviar ticket por WhatsApp
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="tel"
            autoFocus
            value={waPhone}
            onChange={(e) => onWaPhoneChange(e.target.value)}
            placeholder="+54 9 11 1234-5678"
            aria-label="Teléfono"
            className="min-w-0 flex-1 basis-40 rounded-xl border-[1.5px] border-kr-line bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-kr-blue"
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
            aria-disabled={!waPhone.trim()}
            className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-extrabold transition-colors ${
              waPhone.trim() ? 'bg-[#1EA952] text-white hover:bg-[#178A43]' : 'pointer-events-none bg-white text-kr-muted/60'
            }`}
          >
            Enviar
          </a>
        </div>
      )}
    </section>
  );
}
