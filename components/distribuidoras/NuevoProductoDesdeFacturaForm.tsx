'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, MagnifyingGlass, SpinnerGap } from '@phosphor-icons/react';
import { facturas, products, Category, FacturaItem, ImageSearchResult } from '@/lib/api';
import { money } from '@/lib/format';
import ImageUpload from '@/components/ui/ImageUpload';
import { useFotoDeBusqueda } from '@/lib/useFotoDeBusqueda';
import UnitSelector from '@/components/ui/UnitSelector';
import CategorySelector from '@/components/ui/CategorySelector';

interface Props {
  item: FacturaItem;
  facturaId: string;
  categories: Category[];
  categoriesLoading: boolean;
  onCreated: () => void;
  onCancel: () => void;
}

export default function NuevoProductoDesdeFacturaForm({
  item,
  facturaId,
  categories,
  categoriesLoading,
  onCreated,
  onCancel,
}: Props) {
  // mismos valores iniciales que openCreateForm en la página original - se calculan una sola
  // vez al montar (este componente solo existe mientras se está creando el producto de ESTE item)
  const [form, setForm] = useState({
    title: item.nombreDetectado,
    price: '',
    quantity: item.medidaDetectada != null ? String(item.medidaDetectada) : '',
    unit: item.medidaUnidadDetectada ?? '',
    categoryId: '',
    barcode: item.codigoDetectado ?? '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [gananciaDeseadaPct, setGananciaDeseadaPct] = useState('');
  const { aiImageUrl, setAiImageUrl, fotoBuscada, uploadKey, bajandoFoto, elegirFoto } = useFotoDeBusqueda(setImage);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[] | null>(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);

  const createProductMutation = useMutation({
    mutationFn: (form: FormData) => facturas.createProductFromItem(facturaId, item.id, form),
    onSuccess: onCreated,
    onError: (err: any) => setError(err.message ?? 'Error al crear el producto'),
  });

  const handleImageSearch = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setError('Escribí el nombre del producto antes de buscar la imagen');
      return;
    }
    setImageSearchLoading(true);
    setError('');
    try {
      const results = await products.imageSearch(q);
      setImageSearchResults(results);
    } catch (err: any) {
      setError(err.message ?? 'Error al buscar imágenes');
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const code = await products.generateUniqueBarcode();
      setForm((f) => ({ ...f, barcode: code }));
    } catch (err: any) {
      setError(err.message ?? 'Error al generar el código');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const submit = () => {
    if (!image && !aiImageUrl) {
      setError('La imagen es obligatoria');
      return;
    }
    if (!form.title.trim() || !form.price) {
      setError('Falta el nombre o el precio de venta');
      return;
    }
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('price', form.price);
    if (form.quantity) fd.append('quantity', form.quantity);
    if (form.unit) fd.append('unit', form.unit);
    if (form.categoryId) fd.append('categoryId', form.categoryId);
    if (form.barcode) fd.append('barcode', form.barcode);
    if (image) fd.append('image', image);
    else if (aiImageUrl) fd.append('imageSourceUrl', aiImageUrl);
    createProductMutation.mutate(fd);
  };

  return (
    <div className="px-3 pb-4 md:px-4">
        <div className="flex flex-col sm:flex-row gap-4 bg-white border border-kr-line rounded-xl p-4">
          <div className="w-full sm:w-40 flex-shrink-0 flex flex-col gap-2">
            {aiImageUrl ? (
              <div className="relative w-full h-52 border-2 border-kr-navy/30 rounded-xl overflow-hidden bg-kr-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aiImageUrl} alt="Imagen elegida" className="w-full h-full object-contain p-2" />
                <button
                  type="button"
                  onClick={() => setAiImageUrl(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-[#FFE7D6] transition-colors"
                >
                  <X size={14} weight="bold" className="text-kr-muted" />
                </button>
              </div>
            ) : (
              <>
                <ImageUpload key={uploadKey} initialFile={fotoBuscada} onChange={setImage} required={!aiImageUrl} withBgRemoval />
                <button
                  type="button"
                  disabled={imageSearchLoading}
                  onClick={() => handleImageSearch(form.title)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-kr-line text-xs font-bold text-kr-muted hover:bg-kr-paper transition-colors disabled:opacity-50"
                >
                  <MagnifyingGlass size={14} weight="bold" />
                  {imageSearchLoading ? 'Buscando...' : 'Buscar imagen con IA'}
                </button>
                {imageSearchResults && imageSearchResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    {imageSearchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={bajandoFoto !== null}
                        onClick={async () => { await elegirFoto(r.imageUrl, i); setImageSearchResults(null); }}
                        className="relative w-full aspect-square rounded-lg overflow-hidden border border-kr-line hover:border-kr-blue transition-colors bg-kr-paper disabled:cursor-wait"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        {bajandoFoto === i && (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                            <SpinnerGap size={18} className="animate-spin text-kr-blue" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {imageSearchResults && imageSearchResults.length === 0 && (
                  <p className="text-[11px] text-kr-muted text-center">No se encontraron imágenes.</p>
                )}
              </>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Nombre del producto"
                className="flex-1 border border-kr-line rounded-xl px-3 py-2 text-sm outline-none focus:border-kr-blue"
              />
              <div className="w-full sm:w-44 flex flex-col gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Precio al público"
                  className="w-full border border-kr-line rounded-xl px-3 py-2 text-sm outline-none focus:border-kr-blue"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-kr-muted whitespace-nowrap">% ganancia:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={gananciaDeseadaPct}
                    onChange={(e) => {
                      setGananciaDeseadaPct(e.target.value);
                      const pct = parseFloat(e.target.value);
                      const cost = Number(item.precioUnitario);
                      if (cost > 0 && !isNaN(pct)) {
                        setForm((f) => ({ ...f, price: (cost * (1 + pct / 100)).toFixed(2) }));
                      }
                    }}
                    placeholder="Ej: 30"
                    className="w-full border border-kr-line rounded-lg px-2 py-1 text-xs outline-none focus:border-kr-blue"
                  />
                </div>
                {(() => {
                  const cost = Number(item.precioUnitario);
                  const priceNum = parseFloat(form.price);
                  if (!(cost > 0) || isNaN(priceNum)) return null;
                  const pct = ((priceNum - cost) / cost) * 100;
                  return (
                    <p className={`text-[11px] font-bold ${pct >= 0 ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
                      Ganancia actual: {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </p>
                  );
                })()}
                {(() => {
                  const priceNum = parseFloat(form.price);
                  if (isNaN(priceNum) || priceNum <= 0) return null;
                  return (
                    <p className="text-[11px] font-bold text-kr-blue">
                      PedidosYa (+40%): {money(priceNum * 1.4)}
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Medida"
                className="w-28 border border-kr-line rounded-xl px-3 py-2 text-sm outline-none focus:border-kr-blue"
              />
              <UnitSelector value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} />
              <CategorySelector
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                categories={categories}
                loading={categoriesLoading}
              />
            </div>
            <div className="flex gap-2">
              <input
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Código de barras (opcional, o escaneá con el lector)"
                className="flex-1 border border-kr-line rounded-xl px-3 py-2 text-sm outline-none focus:border-kr-blue"
              />
              <button
                type="button"
                disabled={generatingBarcode}
                onClick={handleGenerateBarcode}
                className="px-3 rounded-xl border border-kr-line text-xs font-bold text-kr-muted hover:bg-kr-paper transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {generatingBarcode ? 'Generando...' : 'Generar código'}
              </button>
            </div>
            <p className="text-xs text-kr-muted">
              Precio por mayor: {money(item.precioUnitario)} (de la factura) · Stock inicial 0, se suma al confirmar
            </p>
            {error && <p className="text-xs text-kr-orange-dark font-bold bg-[#FFE7D6] rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-kr-line text-xs font-bold text-kr-muted">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={createProductMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-kr-yellow hover:bg-[#FFD24D] text-kr-navy border-2 border-kr-navy text-xs font-bold transition-colors disabled:opacity-50"
              >
                {createProductMutation.isPending ? 'Creando...' : 'Crear y vincular'}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
