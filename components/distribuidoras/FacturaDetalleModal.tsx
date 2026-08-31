'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Factura, Category } from '@/lib/api';
import { X } from '@phosphor-icons/react';
import { money } from '@/lib/format';
import ImageLightbox from '@/components/ui/ImageLightbox';
import FacturaManualItemsTable from './FacturaManualItemsTable';
import AgregarProductoAFactura from './AgregarProductoAFactura';

interface Props {
  factura: Factura;
  distribuidorId: string;
  distribuidorNombre: string;
  categories: Category[];
  categoriesLoading: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

// vista de detalle de una factura del historial, con diseño de ticket: encabezado, líneas y
// total. Si está confirmada se puede seguir corrigiendo/completando (editar cantidad, costo,
// precio, ganancia, código de artículo, o agregar un producto que faltó cargar) - una
// cancelada queda de solo lectura, el backend rechaza cualquier cambio sobre ella.
export default function FacturaDetalleModal({
  factura,
  distribuidorId,
  distribuidorNombre,
  categories,
  categoriesLoading,
  onClose,
  onChanged,
}: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lightboxUrl) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightboxUrl]);

  const cancelada = factura.status === 'CANCELLED';
  const editable = factura.status === 'CONFIRMED';

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-10 sm:pt-16 animate-fadeIn overflow-y-auto pb-8"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 p-5 border-b border-dashed border-gray-300">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Factura</p>
              <h2 className="text-lg font-extrabold text-gray-800">{distribuidorNombre}</h2>
              <p className="text-sm text-gray-500 font-medium">
                {new Date(factura.createdAt).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  factura.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {STATUS_LABEL[factura.status]}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>

          {factura.imageUrl && (
            <div className="px-5 pt-4">
              <button
                type="button"
                onClick={() => setLightboxUrl(factura.imageUrl)}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600"
              >
                Ver imagen original de la factura
              </button>
            </div>
          )}

          <div className="p-5 flex flex-col gap-4">
            <FacturaManualItemsTable
              facturaId={factura.id}
              items={factura.items}
              onChanged={onChanged}
              allowRemove={false}
              readOnly={cancelada}
            />

            {editable && (
              <div className="border-t border-dashed border-gray-300 pt-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                  Agregar un producto que faltó cargar
                </p>
                <AgregarProductoAFactura
                  facturaId={factura.id}
                  distribuidorId={distribuidorId}
                  categories={categories}
                  categoriesLoading={categoriesLoading}
                  onAdded={onChanged}
                />
              </div>
            )}

            {cancelada && (
              <p className="text-xs text-gray-400 font-medium text-center">
                Esta factura está cancelada, no se puede editar.
              </p>
            )}

            <div className="border-t border-dashed border-gray-300 pt-4 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-extrabold text-orange-500">{money(factura.total)}</p>
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && <ImageLightbox imageUrl={lightboxUrl} alt="Factura" onClose={() => setLightboxUrl(null)} />}
    </>
  );
}
