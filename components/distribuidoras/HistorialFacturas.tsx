'use client';

import Image from 'next/image';
import { Factura } from '@/lib/api';
import { money } from '@/lib/format';

const STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

interface Props {
  facturas: Factura[];
  onViewImage: (url: string) => void;
}

export default function HistorialFacturas({ facturas, onViewImage }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-700">Historial de facturas</p>
      </div>
      {facturas.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400 font-medium">Todavía no hay facturas confirmadas.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {facturas.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-5 py-3">
              {f.imageUrl ? (
                <button
                  type="button"
                  onClick={() => onViewImage(f.imageUrl!)}
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-zoom-in"
                  title="Ver imagen ampliada"
                >
                  <Image src={f.imageUrl} alt="Factura" fill sizes="48px" className="object-cover" />
                </button>
              ) : (
                <div
                  title="La imagen se borró automáticamente (factura cancelada hace más de 2 días)"
                  className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-[9px] text-gray-400 font-semibold text-center leading-tight"
                >
                  Sin imagen
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">{new Date(f.createdAt).toLocaleDateString('es-AR')}</p>
                <p className="text-xs text-gray-400">{f.items.length} ítems</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  f.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {STATUS_LABEL[f.status]}
              </span>
              <span className="font-bold text-orange-500 w-24 text-right">{money(f.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
