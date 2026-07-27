'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { distribuidores, facturas, products, Factura, FacturaItem, Product } from '@/lib/api';
import { CaretLeft, UploadSimple, Trash, Warning, Check, X } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

export default function DistribuidoraDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeFacturaId, setActiveFacturaId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [toCancel, setToCancel] = useState<Factura | null>(null);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [linkQuery, setLinkQuery] = useState('');
  const [linkResults, setLinkResults] = useState<Product[] | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNombre, setManualNombre] = useState('');
  const [manualPrecio, setManualPrecio] = useState('');
  const [manualCantidad, setManualCantidad] = useState('1');

  const { data, isLoading } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['distribuidor', id] });

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

  const addItemMutation = useMutation({
    mutationFn: ({ facturaId, data: itemData }: { facturaId: string; data: any }) =>
      facturas.addItem(facturaId, itemData),
    onSuccess: () => {
      invalidate();
      setManualOpen(false);
      setManualNombre('');
      setManualPrecio('');
      setManualCantidad('1');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const handleSearchProduct = async (item: FacturaItem, query: string) => {
    setLinkQuery(query);
    if (!query.trim()) {
      setLinkResults(null);
      return;
    }
    const result = await products.getAll({ search: query, limit: 6 });
    setLinkResults(result.data);
  };

  const linkProduct = (facturaId: string, item: FacturaItem, product: Product) => {
    updateItemMutation.mutate({ facturaId, itemId: item.id, data: { productId: product.id } });
    setLinkingItemId(null);
    setLinkQuery('');
    setLinkResults(null);
  };

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/distribuidoras" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-800">{data.nombre}</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data.telefono ?? 'Sin teléfono'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total gastado</p>
          <p className="text-2xl font-extrabold text-orange-500">{money(totalGastado)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-700">Cargar una factura nueva</p>
          <p className="text-xs text-gray-400 mt-0.5">Sacale una foto y la IA va a leer los productos automáticamente</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            <UploadSimple size={16} weight="bold" />
            {uploadMutation.isPending ? 'Leyendo factura...' : 'Cargar factura'}
          </button>
        </div>
      </div>
      {uploadError && (
        <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
      )}

      {pendientes.length > 0 && !activeFactura && (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Facturas pendientes de revisión</p>
          <div className="flex flex-wrap gap-2">
            {pendientes.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFacturaId(f.id)}
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
              <Image src={activeFactura.imageUrl} alt="Factura" fill sizes="280px" className="object-contain" />
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
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Cant.</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Precio</th>
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
                    activeFactura.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3">
                          <input
                            defaultValue={item.nombreDetectado}
                            onBlur={(e) =>
                              e.target.value !== item.nombreDetectado &&
                              updateItemMutation.mutate({
                                facturaId: activeFactura.id,
                                itemId: item.id,
                                data: { nombreDetectado: e.target.value },
                              })
                            }
                            className="w-full text-sm font-semibold text-gray-700 outline-none border-b border-transparent focus:border-orange-300"
                          />
                          {item.product ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Check size={12} weight="bold" className="text-green-500" />
                              <span className="text-xs text-green-600 font-semibold">{item.product.title}</span>
                              <button
                                onClick={() =>
                                  updateItemMutation.mutate({
                                    facturaId: activeFactura.id,
                                    itemId: item.id,
                                    data: { productId: null },
                                  })
                                }
                                className="text-gray-300 hover:text-red-500"
                              >
                                <X size={12} weight="bold" />
                              </button>
                            </div>
                          ) : linkingItemId === item.id ? (
                            <div className="mt-1 relative">
                              <input
                                autoFocus
                                value={linkQuery}
                                onChange={(e) => handleSearchProduct(item, e.target.value)}
                                onBlur={() => setTimeout(() => setLinkingItemId(null), 150)}
                                placeholder="Buscar producto..."
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-400"
                              />
                              {linkResults && linkResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-100 rounded-lg shadow-lg overflow-hidden">
                                  {linkResults.map((p) => (
                                    <button
                                      key={p.id}
                                      onMouseDown={() => linkProduct(activeFactura.id, item, p)}
                                      className="block w-full text-left px-3 py-2 text-xs hover:bg-orange-50"
                                    >
                                      {p.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setLinkingItemId(item.id); setLinkQuery(''); setLinkResults(null); }}
                              className="text-xs text-gray-400 hover:text-orange-500 font-medium mt-1"
                            >
                              Sin vincular · buscar producto
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            defaultValue={item.cantidad}
                            onBlur={(e) =>
                              parseFloat(e.target.value) !== item.cantidad &&
                              updateItemMutation.mutate({
                                facturaId: activeFactura.id,
                                itemId: item.id,
                                data: { cantidad: parseFloat(e.target.value) },
                              })
                            }
                            className="w-16 text-sm font-semibold outline-none border-b border-transparent focus:border-orange-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.precioUnitario}
                            onBlur={(e) =>
                              parseFloat(e.target.value) !== Number(item.precioUnitario) &&
                              updateItemMutation.mutate({
                                facturaId: activeFactura.id,
                                itemId: item.id,
                                data: { precioUnitario: parseFloat(e.target.value) },
                              })
                            }
                            className="w-20 text-sm font-semibold outline-none border-b border-transparent focus:border-orange-300"
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-orange-500">{money(item.subtotal)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeItemMutation.mutate({ facturaId: activeFactura.id, itemId: item.id })}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash size={14} weight="bold" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="p-4 border-t border-gray-100">
                {manualOpen ? (
                  <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualNombre}
                        onChange={(e) => setManualNombre(e.target.value)}
                        placeholder="Descripción"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                      />
                      <input
                        type="number"
                        value={manualCantidad}
                        onChange={(e) => setManualCantidad(e.target.value)}
                        placeholder="Cant."
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={manualPrecio}
                        onChange={(e) => setManualPrecio(e.target.value)}
                        placeholder="Precio"
                        className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setManualOpen(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() =>
                          addItemMutation.mutate({
                            facturaId: activeFactura.id,
                            data: {
                              nombreDetectado: manualNombre,
                              cantidad: parseFloat(manualCantidad || '1'),
                              precioUnitario: parseFloat(manualPrecio || '0'),
                            },
                          })
                        }
                        disabled={!manualNombre.trim() || !manualPrecio}
                        className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setManualOpen(true)}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                  >
                    + Agregar línea manual
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total de la factura</p>
                <p className="text-xl font-extrabold text-gray-800">{money(activeFactura.total)}</p>
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
                  disabled={activeFactura.items.length === 0 || confirmMutation.isPending}
                  className="py-2.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold transition-colors disabled:opacity-50"
                >
                  {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar factura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-700">Historial de facturas</p>
        </div>
        {historial.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 font-medium">Todavía no hay facturas confirmadas.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {historial.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-3">
                <a href={f.imageUrl} target="_blank" rel="noopener noreferrer" className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image src={f.imageUrl} alt="Factura" fill sizes="48px" className="object-cover" />
                </a>
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

      {toCancel && (
        <ConfirmModal
          message="¿Cancelar esta factura? Se pierden los productos cargados."
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(toCancel.id)}
          onCancel={() => setToCancel(null)}
        />
      )}
    </div>
  );
}
