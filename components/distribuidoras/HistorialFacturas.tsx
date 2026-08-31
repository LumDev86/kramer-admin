'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Factura, Category } from '@/lib/api';
import { money } from '@/lib/format';
import FacturaDetalleModal from './FacturaDetalleModal';

const STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

interface Props {
  facturas: Factura[];
  onViewImage: (url: string) => void;
  distribuidorId: string;
  distribuidorNombre: string;
  categories: Category[];
  categoriesLoading: boolean;
  onChanged: () => void;
}

export default function HistorialFacturas({
  facturas,
  onViewImage,
  distribuidorId,
  distribuidorNombre,
  categories,
  categoriesLoading,
  onChanged,
}: Props) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  // deriva siempre del array vigente, para que los cambios hechos adentro del modal
  // (editar/agregar un producto) se reflejen sin tener que cerrarlo y volver a abrirlo
  const viewing = viewingId ? facturas.find((f) => f.id === viewingId) ?? null : null;

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
            <div
              key={f.id}
              onClick={() => setViewingId(f.id)}
              className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {f.imageUrl ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onViewImage(f.imageUrl!); }}
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-zoom-in"
                  title="Ver imagen ampliada"
                >
                  <Image src={f.imageUrl} alt="Factura" fill sizes="48px" className="object-cover" />
                </button>
              ) : (
                <div
                  title="Sin imagen (factura cargada a mano, o imagen borrada tras cancelación)"
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

      {viewing && (
        <FacturaDetalleModal
          factura={viewing}
          distribuidorId={distribuidorId}
          distribuidorNombre={distribuidorNombre}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onClose={() => setViewingId(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
