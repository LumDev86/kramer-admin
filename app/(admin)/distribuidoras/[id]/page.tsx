'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { distribuidores, facturas, products, categories, Factura, FacturaItem, Product } from '@/lib/api';
import { CaretLeft, UploadSimple, Trash, Warning, Check, X } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ImageUpload from '@/components/ui/ImageUpload';
import UnitSelector from '@/components/ui/UnitSelector';
import CategorySelector from '@/components/ui/CategorySelector';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

const getPriceChange = (item: FacturaItem): { pct: number; oldCost: number; newCost: number } | null => {
  if (!item.product?.cost) return null;
  const oldCost = Number(item.product.cost);
  const newCost = Number(item.precioUnitario);
  if (!(oldCost > 0) || Math.abs(newCost - oldCost) < 0.01) return null;
  return { pct: ((newCost - oldCost) / oldCost) * 100, oldCost, newCost };
};

export default function DistribuidoraDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeFacturaId, setActiveFacturaId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [revealCount, setRevealCount] = useState(Infinity);
  const [toCancel, setToCancel] = useState<Factura | null>(null);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [linkQuery, setLinkQuery] = useState('');
  const [linkResults, setLinkResults] = useState<Product[] | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNombre, setManualNombre] = useState('');
  const [manualPrecio, setManualPrecio] = useState('');
  const [manualCantidad, setManualCantidad] = useState('1');
  const [creatingItemId, setCreatingItemId] = useState<string | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    title: '',
    price: '',
    priceWholesale: '',
    quantity: '',
    unit: '',
    categoryId: '',
    barcode: '',
  });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [newProductError, setNewProductError] = useState('');
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [gananciaMayorPct, setGananciaMayorPct] = useState('');

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

  const { data: suggestions } = useQuery({
    queryKey: ['factura', 'suggestions', activeFacturaId],
    queryFn: () => facturas.getSuggestions(activeFacturaId!),
    enabled: !!activeFacturaId,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const createProductMutation = useMutation({
    mutationFn: ({ facturaId, itemId, form }: { facturaId: string; itemId: string; form: FormData }) =>
      facturas.createProductFromItem(facturaId, itemId, form),
    onSuccess: () => {
      invalidate();
      setCreatingItemId(null);
      setNewProductForm({ title: '', price: '', priceWholesale: '', quantity: '', unit: '', categoryId: '', barcode: '' });
      setNewProductImage(null);
      setNewProductError('');
      setGananciaMayorPct('');
    },
    onError: (err: any) => setNewProductError(err.message ?? 'Error al crear el producto'),
  });

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const code = await products.generateUniqueBarcode();
      setNewProductForm((f) => ({ ...f, barcode: code }));
    } catch (err: any) {
      setNewProductError(err.message ?? 'Error al generar el código');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const openCreateForm = (item: FacturaItem) => {
    setCreatingItemId(item.id);
    setLinkingItemId(null);
    setNewProductForm({
      title: item.nombreDetectado,
      price: '',
      priceWholesale: item.precioUnitario,
      quantity: item.medidaDetectada != null ? String(item.medidaDetectada) : '',
      unit: item.medidaUnidadDetectada ?? '',
      categoryId: '',
      barcode: item.codigoDetectado ?? '',
    });
    setNewProductImage(null);
    setNewProductError('');
    setGananciaMayorPct('');
  };

  const submitCreateProduct = (facturaId: string) => {
    if (!creatingItemId) return;
    if (!newProductImage) { setNewProductError('La imagen es obligatoria'); return; }
    if (!newProductForm.title.trim() || !newProductForm.price) {
      setNewProductError('Falta el nombre o el precio de venta');
      return;
    }
    const fd = new FormData();
    fd.append('title', newProductForm.title.trim());
    fd.append('price', newProductForm.price);
    if (newProductForm.priceWholesale) fd.append('priceWholesale', newProductForm.priceWholesale);
    if (newProductForm.quantity) fd.append('quantity', newProductForm.quantity);
    if (newProductForm.unit) fd.append('unit', newProductForm.unit);
    if (newProductForm.categoryId) fd.append('categoryId', newProductForm.categoryId);
    if (newProductForm.barcode) fd.append('barcode', newProductForm.barcode);
    fd.append('image', newProductImage);
    createProductMutation.mutate({ facturaId, itemId: creatingItemId, form: fd });
  };

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

  const linkProduct = (facturaId: string, item: FacturaItem, product: { id: string }) => {
    updateItemMutation.mutate({ facturaId, itemId: item.id, data: { productId: product.id } });
    setLinkingItemId(null);
    setLinkQuery('');
    setLinkResults(null);
  };

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
      {uploadMutation.isPending && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 animate-fadeIn">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-orange-600 font-semibold">
            La IA está leyendo la factura, esto puede tardar unos segundos...
          </p>
        </div>
      )}
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
                      <Fragment key={item.id}>
                      <tr className="align-top animate-slideUp">
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
                          {item.unidadesPorBultoDetectada != null && (
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                              📦 Detectado por bulto de {item.unidadesPorBultoDetectada} un. · cant./precio ya normalizados por unidad
                            </p>
                          )}
                          {item.product ? (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex items-center gap-1.5">
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
                              {(() => {
                                const change = getPriceChange(item);
                                if (!change) return null;
                                const subiendo = change.pct > 0;
                                return (
                                  <p className={`text-[11px] font-bold ${subiendo ? 'text-red-500' : 'text-green-600'}`}>
                                    {subiendo ? '⬆' : '⬇'} {subiendo ? 'Aumentó' : 'Bajó'} {Math.abs(change.pct).toFixed(1)}%
                                    {' '}respecto a la última factura ({money(change.oldCost)} → {money(change.newCost)})
                                  </p>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-1">
                              {suggestions?.[item.id] && suggestions[item.id].length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {suggestions[item.id].map((s) => (
                                    <button
                                      key={s.id}
                                      onClick={() => linkProduct(activeFactura.id, item, s)}
                                      title={[s.quantity, s.unit].filter(Boolean).join(' ')}
                                      className="px-2 py-1 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 text-[11px] font-semibold hover:bg-orange-100 transition-colors"
                                    >
                                      ¿{s.title}?
                                    </button>
                                  ))}
                                </div>
                              )}
                              {linkingItemId === item.id ? (
                                <div className="relative">
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
                              ) : creatingItemId === item.id ? (
                                <span className="text-xs text-orange-500 font-semibold">Completando alta abajo ↓</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setLinkingItemId(item.id); setLinkQuery(''); setLinkResults(null); }}
                                    className="text-xs text-gray-400 hover:text-orange-500 font-medium"
                                  >
                                    Sin vincular · buscar
                                  </button>
                                  <span className="text-gray-200">·</span>
                                  <button
                                    onClick={() => openCreateForm(item)}
                                    className="text-xs text-orange-500 hover:text-orange-600 font-bold"
                                  >
                                    + Crear producto nuevo
                                  </button>
                                </div>
                              )}
                            </div>
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
                      {creatingItemId === item.id && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-4 bg-orange-50/30">
                            <div className="flex flex-col sm:flex-row gap-4 bg-white border border-orange-100 rounded-xl p-4">
                              <div className="w-full sm:w-40 flex-shrink-0">
                                <ImageUpload onChange={setNewProductImage} required />
                              </div>
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={newProductForm.title}
                                    onChange={(e) => setNewProductForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="Nombre del producto"
                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newProductForm.price}
                                    onChange={(e) => setNewProductForm((f) => ({ ...f, price: e.target.value }))}
                                    placeholder="Precio por menor"
                                    className="w-full sm:w-36 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                                  />
                                  <div className="w-full sm:w-44 flex flex-col gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newProductForm.priceWholesale}
                                      onChange={(e) => setNewProductForm((f) => ({ ...f, priceWholesale: e.target.value }))}
                                      placeholder="Precio por mayor (opcional)"
                                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-gray-400 whitespace-nowrap">% ganancia:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={gananciaMayorPct}
                                        onChange={(e) => {
                                          setGananciaMayorPct(e.target.value);
                                          const pct = parseFloat(e.target.value);
                                          const cost = Number(item.precioUnitario);
                                          if (cost > 0 && !isNaN(pct)) {
                                            setNewProductForm((f) => ({
                                              ...f,
                                              priceWholesale: (cost * (1 + pct / 100)).toFixed(2),
                                            }));
                                          }
                                        }}
                                        placeholder="Ej: 30"
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={newProductForm.quantity}
                                    onChange={(e) => setNewProductForm((f) => ({ ...f, quantity: e.target.value }))}
                                    placeholder="Medida"
                                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                                  />
                                  <UnitSelector
                                    value={newProductForm.unit}
                                    onChange={(v) => setNewProductForm((f) => ({ ...f, unit: v }))}
                                  />
                                  <CategorySelector
                                    value={newProductForm.categoryId}
                                    onChange={(v) => setNewProductForm((f) => ({ ...f, categoryId: v }))}
                                    categories={catsData?.data ?? []}
                                    loading={!catsData}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    value={newProductForm.barcode}
                                    onChange={(e) => setNewProductForm((f) => ({ ...f, barcode: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                    placeholder="Código de barras (opcional, o escaneá con el lector)"
                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
                                  />
                                  <button
                                    type="button"
                                    disabled={generatingBarcode}
                                    onClick={handleGenerateBarcode}
                                    className="px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {generatingBarcode ? 'Generando...' : 'Generar código'}
                                  </button>
                                </div>
                                <p className="text-xs text-gray-400">
                                  Costo: {money(item.precioUnitario)} (de la factura) · Stock inicial 0, se suma al confirmar
                                </p>
                                {newProductError && (
                                  <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{newProductError}</p>
                                )}
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => setCreatingItemId(null)}
                                    className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => submitCreateProduct(activeFactura.id)}
                                    disabled={createProductMutation.isPending}
                                    className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                                  >
                                    {createProductMutation.isPending ? 'Creando...' : 'Crear y vincular'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
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
