'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, MagnifyingGlass } from '@phosphor-icons/react';
import { products, Category, ImageSearchResult, Product } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import UnitSelector from '@/components/ui/UnitSelector';
import CategorySelector from '@/components/ui/CategorySelector';

interface Props {
  categories: Category[];
  categoriesLoading: boolean;
  // qué hacer una vez creado el producto (registrar la compra ya confirmada, o agregarlo como
  // línea de una factura manual en construcción) - lo decide quien use este formulario
  onRegistrar: (product: Product, cantidad: number, costo: number) => Promise<unknown>;
  onCreated: () => void;
  onCancel: () => void;
}

// analogo a NuevoProductoDesdeFacturaForm, pero para un producto que nunca se compró antes
// (no viene de un ítem de factura detectado) - el costo/cantidad se tipean a mano
export default function NuevoProductoManualForm({
  categories,
  categoriesLoading,
  onRegistrar,
  onCreated,
  onCancel,
}: Props) {
  const [title, setTitle] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('');
  const [form, setForm] = useState({ price: '', quantity: '', unit: '', categoryId: '', barcode: '' });
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [gananciaDeseadaPct, setGananciaDeseadaPct] = useState('');
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[] | null>(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', title.trim());
      fd.append('price', form.price);
      fd.append('stock', '0');
      if (form.quantity) fd.append('quantity', form.quantity);
      if (form.unit) fd.append('unit', form.unit);
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      if (form.barcode) fd.append('barcode', form.barcode);
      if (image) fd.append('image', image);
      else if (aiImageUrl) fd.append('imageSourceUrl', aiImageUrl);

      const product = await products.create(fd);
      return onRegistrar(product, parseFloat(cantidad || '1'), parseFloat(costo));
    },
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
    if (!title.trim() || !costo || !form.price) {
      setError('Falta el nombre, el costo o el precio de venta');
      return;
    }
    createMutation.mutate();
  };

  const costNum = parseFloat(costo);
  const priceNum = parseFloat(form.price);
  const pct = costNum > 0 && !isNaN(priceNum) ? ((priceNum - costNum) / costNum) * 100 : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 border border-orange-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">Crear producto nuevo</p>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={15} weight="bold" />
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-40 flex-shrink-0 flex flex-col gap-2">
          {aiImageUrl ? (
            <div className="relative w-full h-52 border-2 border-orange-200 rounded-xl overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiImageUrl} alt="Imagen elegida" className="w-full h-full object-contain p-2" />
              <button
                type="button"
                onClick={() => setAiImageUrl(null)}
                className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <X size={14} weight="bold" className="text-gray-500" />
              </button>
            </div>
          ) : (
            <>
              <ImageUpload onChange={setImage} required={!aiImageUrl} />
              <button
                type="button"
                disabled={imageSearchLoading}
                onClick={() => handleImageSearch(title)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                      onClick={() => { setAiImageUrl(r.imageUrl); setImageSearchResults(null); setImage(null); }}
                      className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-orange-400 transition-colors bg-gray-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {imageSearchResults && imageSearchResults.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center">No se encontraron imágenes.</p>
              )}
            </>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del producto"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
          />
          <div className="flex flex-wrap gap-2">
            <div className="w-24">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cantidad</label>
              <input
                type="number"
                step="1"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Costo</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Precio</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">% ganancia</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={gananciaDeseadaPct}
                onChange={(e) => {
                  setGananciaDeseadaPct(e.target.value);
                  const p = parseFloat(e.target.value);
                  if (costNum > 0 && !isNaN(p)) setForm((f) => ({ ...f, price: (costNum * (1 + p / 100)).toFixed(2) }));
                }}
                placeholder="Ej: 30"
                className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>
          {pct !== null && (
            <p className={`text-[11px] font-semibold ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              Ganancia actual: {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="Medida"
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
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
          {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={createMutation.isPending}
              className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear producto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
