'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { distribuidores, facturas, products, categories, Factura } from '@/lib/api';
import { CaretLeft, Warning, TrendUp } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ImageLightbox from '@/components/ui/ImageLightbox';
import AplicarAumentoModal from '@/components/ui/AplicarAumentoModal';
import { money } from '@/lib/format';
import SubirFacturaCard from '@/components/distribuidoras/SubirFacturaCard';
import FacturaItemRow from '@/components/distribuidoras/FacturaItemRow';
import AgregarLineaManual from '@/components/distribuidoras/AgregarLineaManual';
import HistorialFacturas from '@/components/distribuidoras/HistorialFacturas';

export default function DistribuidoraDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();

  const [activeFacturaId, setActiveFacturaId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [revealCount, setRevealCount] = useState(Infinity);
  const [toCancel, setToCancel] = useState<Factura | null>(null);
  const [showAumentoModal, setShowAumentoModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['distribuidor', id] });
    qc.invalidateQueries({ queryKey: ['factura', 'suggestions'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('image', file);
      return facturas.create(id, form);
    },
    onSuccess: (factura) => {
      invalidate();
      setActiveFacturaId(factura.id);
      setUploadError('');
      setRevealCount(0);
    },
    onError: (err: any) => setUploadError(err.message ?? 'Error al procesar la factura'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ facturaId, itemId, data: itemData }: { facturaId: string; itemId: string; data: any }) =>
      facturas.updateItem(facturaId, itemId, itemData),
    onSuccess: invalidate,
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ facturaId, itemId }: { facturaId: string; itemId: string }) =>
      facturas.removeItem(facturaId, itemId),
    onSuccess: invalidate,
  });

  const updateProductPriceMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) => {
      const form = new FormData();
      form.append('price', String(price));
      return products.update(productId, form);
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (facturaId: string) => facturas.confirm(facturaId),
    onSuccess: () => {
      invalidate();
      setActiveFacturaId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (facturaId: string) => facturas.cancel(facturaId),
    onSuccess: () => {
      invalidate();
      setToCancel(null);
      setActiveFacturaId(null);
    },
  });

  const { data: suggestions } = useQuery({
    queryKey: ['factura', 'suggestions', activeFacturaId],
    queryFn: () => facturas.getSuggestions(activeFacturaId!),
    enabled: !!activeFacturaId,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const activeFacturaItemCount = data?.facturas.find((f) => f.id === activeFacturaId)?.items.length ?? 0;

  useEffect(() => {
    if (revealCount >= activeFacturaItemCount) return;
    const timer = setTimeout(() => setRevealCount((c) => c + 1), 220);
    return () => clearTimeout(timer);
  }, [revealCount, activeFacturaItemCount]);

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  if (!data) return null;

  const totalGastado = data.facturas
    .filter((f) => f.status === 'CONFIRMED')
    .reduce((sum, f) => sum + Number(f.total), 0);

  const pendientes = data.facturas.filter((f) => f.status === 'PENDING_REVIEW');
  const historial = data.facturas.filter((f) => f.status !== 'PENDING_REVIEW');
  const activeFactura = data.facturas.find((f) => f.id === activeFacturaId) ?? null;
  const unresolvedCount = activeFactura ? activeFactura.items.filter((i) => !i.productId).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/distribuidoras" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-800 truncate">{data.nombre}</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data.telefono ?? 'Sin teléfono'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total gastado</p>
          <p className="text-2xl font-extrabold text-orange-500">{money(totalGastado)}</p>
        </div>
        <button
          onClick={() => setShowAumentoModal(true)}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <TrendUp size={16} weight="bold" />
          Aplicar aumento
        </button>
      </div>

      <SubirFacturaCard
        onUpload={(file) => uploadMutation.mutate(file)}
        uploading={uploadMutation.isPending}
        error={uploadError}
      />

      {pendientes.length > 0 && !activeFactura && (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Facturas pendientes de revisión</p>
          <div className="flex flex-wrap gap-2">
            {pendientes.map((f) => (
              <button
                key={f.id}
                onClick={() => { setActiveFacturaId(f.id); setRevealCount(Infinity); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 text-xs font-bold"
              >
                {money(f.total)} · {f.items.length} ítems
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFactura && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
              {activeFactura.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setLightboxUrl(activeFactura.imageUrl)}
                  className="absolute inset-0 cursor-zoom-in"
                  title="Ver imagen ampliada"
                >
                  <Image src={activeFactura.imageUrl} alt="Factura" fill sizes="280px" className="object-contain" />
                </button>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium text-center px-4">
                  Imagen eliminada
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {activeFactura.extractionError && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-semibold">
                <Warning size={16} weight="fill" />
                No se pudo leer la factura automáticamente ({activeFactura.extractionError}). Cargá los productos a mano.
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Cant.</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">P. Unitario</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Subtotal</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeFactura.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                        Sin productos todavía.
                      </td>
                    </tr>
                  ) : (
                    activeFactura.items.slice(0, revealCount).map((item) => (
                      <FacturaItemRow
                        key={item.id}
                        item={item}
                        facturaId={activeFactura.id}
                        suggestions={suggestions?.[item.id] ?? []}
                        categories={catsData?.data ?? []}
                        categoriesLoading={!catsData}
                        onUpdate={(itemData) =>
                          updateItemMutation.mutate({ facturaId: activeFactura.id, itemId: item.id, data: itemData })
                        }
                        onRemove={() => removeItemMutation.mutate({ facturaId: activeFactura.id, itemId: item.id })}
                        onVincular={(product, precio) => {
                          updateItemMutation.mutate({
                            facturaId: activeFactura.id,
                            itemId: item.id,
                            data: { productId: product.id },
                          });
                          const newPrice = parseFloat(precio);
                          if (!isNaN(newPrice) && newPrice > 0 && newPrice !== Number(product.price)) {
                            updateProductPriceMutation.mutate({ productId: product.id, price: newPrice });
                          }
                        }}
                        onActualizarPrecioProducto={(productId, price) =>
                          updateProductPriceMutation.mutate({ productId, price })
                        }
                        actualizandoPrecio={updateProductPriceMutation.isPending}
                        onProductCreated={invalidate}
                      />
                    ))
                  )}
                  {revealCount < activeFactura.items.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <span className="text-xs text-orange-500 font-semibold">
                            Detectando productos... ({revealCount}/{activeFactura.items.length})
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

              <div className="p-4 border-t border-gray-100">
                <AgregarLineaManual facturaId={activeFactura.id} onAdded={invalidate} />
              </div>
            </div>

            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total de la factura</p>
                <p className="text-xl font-extrabold text-gray-800">{money(activeFactura.total)}</p>
                {unresolvedCount > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    Quedan {unresolvedCount} producto{unresolvedCount > 1 ? 's' : ''} sin resolver
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setToCancel(activeFactura)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar factura
                </button>
                <button
                  onClick={() => confirmMutation.mutate(activeFactura.id)}
                  disabled={activeFactura.items.length === 0 || unresolvedCount > 0 || confirmMutation.isPending}
                  className="py-2.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold transition-colors disabled:opacity-50"
                >
                  {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar factura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <HistorialFacturas facturas={historial} onViewImage={setLightboxUrl} />

      {toCancel && (
        <ConfirmModal
          message="¿Cancelar esta factura? Se pierden los productos cargados."
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(toCancel.id)}
          onCancel={() => setToCancel(null)}
        />
      )}

      {lightboxUrl && <ImageLightbox imageUrl={lightboxUrl} alt="Factura" onClose={() => setLightboxUrl(null)} />}

      {showAumentoModal && (
        <AplicarAumentoModal
          distribuidorId={id}
          distribuidorNombre={data.nombre}
          onClose={() => setShowAumentoModal(false)}
          onApplied={() => {
            invalidate();
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
    </div>
  );
}
