'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, products, categories } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import UnitSelector from '@/components/ui/UnitSelector';
import CategorySelector from '@/components/ui/CategorySelector';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

interface Props {
  product?: Product;
}

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = !!product;

  const [form, setForm] = useState({
    title:       product?.title                        ?? '',
    description: product?.description                  ?? '',
    price:       product?.price                        ?? '',
    priceWholesale: product?.priceWholesale             ?? '',
    cost:        product?.cost                         ?? '',
    categoryId:  product?.categoryId                   ?? '',
    quantity:    product?.quantity != null ? String(product.quantity) : '',
    unit:        product?.unit                         ?? '',
    barcode:     product?.barcode                      ?? '',
    isActive:    product?.isActive                     ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [bultoPrecio, setBultoPrecio] = useState('');
  const [bultoUnidades, setBultoUnidades] = useState('');
  const [gananciaMayorPct, setGananciaMayorPct] = useState('');

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('price',       form.price);
      fd.append('priceWholesale', form.priceWholesale);
      fd.append('cost',        form.cost);
      if (!isEdit) fd.append('stock', '0');
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      if (form.quantity)   fd.append('quantity',   form.quantity);
      if (form.unit)       fd.append('unit',        form.unit);
      if (form.barcode)    fd.append('barcode',     form.barcode);
      fd.append('isActive', String(form.isActive));
      if (image) fd.append('image', image);

      if (isEdit) {
        await products.update(product.id, fd);
      } else {
        await products.create(fd);
      }
      qc.invalidateQueries({ queryKey: ['products'] });
      router.push('/productos');
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const code = await products.generateUniqueBarcode();
      set('barcode', code);
    } catch (err: any) {
      setError(err.message ?? 'Error al generar el código');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const costNum = parseFloat(form.cost);
  const priceNum = parseFloat(form.price);
  const gananciaPct =
    costNum > 0 && !isNaN(priceNum) ? ((priceNum - costNum) / costNum) * 100 : null;

  const bultoPrecioNum = parseFloat(bultoPrecio);
  const bultoUnidadesNum = parseFloat(bultoUnidades);
  const costoPorUnidad =
    bultoPrecioNum > 0 && bultoUnidadesNum > 0 ? bultoPrecioNum / bultoUnidadesNum : null;

  const applyCostoPorUnidad = () => {
    if (costoPorUnidad === null) return;
    set('cost', costoPorUnidad.toFixed(2));
    setBultoPrecio('');
    setBultoUnidades('');
  };

  const handleGananciaMayorChange = (value: string) => {
    setGananciaMayorPct(value);
    const pct = parseFloat(value);
    if (costNum > 0 && !isNaN(pct)) {
      set('priceWholesale', (costNum * (1 + pct / 100)).toFixed(2));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 max-w-xl">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Imagen {!isEdit && '*'}</label>
        <ImageUpload currentUrl={product?.imageUrl} onChange={setImage} required={!isEdit} withBgRemoval />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Título *</label>
        <input
          required
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Nombre del producto"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Descripción *</label>
        <textarea
          required
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Descripción del producto"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Precio por menor *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="0.00"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Precio por mayor</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.priceWholesale}
            onChange={(e) => set('priceWholesale', e.target.value)}
            placeholder="Opcional"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400 whitespace-nowrap">% ganancia deseado:</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={gananciaMayorPct}
              onChange={(e) => handleGananciaMayorChange(e.target.value)}
              disabled={!(costNum > 0)}
              placeholder={costNum > 0 ? 'Ej: 30' : 'Cargá el costo primero'}
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400 font-medium disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Costo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={(e) => set('cost', e.target.value)}
            placeholder="Se completa solo al confirmar una factura"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-gray-400 whitespace-nowrap">Bulto/bolsa:</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bultoPrecio}
              onChange={(e) => setBultoPrecio(e.target.value)}
              placeholder="Precio total"
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400 font-medium"
            />
            <span className="text-[11px] text-gray-400">/</span>
            <input
              type="number"
              min="0"
              step="1"
              value={bultoUnidades}
              onChange={(e) => setBultoUnidades(e.target.value)}
              placeholder="Unidades"
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-orange-400 font-medium"
            />
            <button
              type="button"
              disabled={costoPorUnidad === null}
              onClick={applyCostoPorUnidad}
              className="px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              Usar
            </button>
          </div>
          {costoPorUnidad !== null && (
            <p className="text-[11px] text-orange-500 font-semibold">${costoPorUnidad.toFixed(2)} por unidad</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Ganancia (sobre el costo)</label>
          <div className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2.5 text-sm font-bold flex items-center h-[42px]">
            {gananciaPct === null ? (
              <span className="text-gray-300 font-medium">—</span>
            ) : (
              <span className={gananciaPct >= 0 ? 'text-green-600' : 'text-red-500'}>
                {gananciaPct >= 0 ? '+' : ''}{gananciaPct.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">Según precio por menor vs. costo</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Categoría</label>
        <CategorySelector
          value={form.categoryId}
          onChange={(v) => set('categoryId', v)}
          categories={catsData?.data ?? []}
          loading={!catsData}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Medida / Gramaje</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            placeholder="Ej: 500"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
          <UnitSelector value={form.unit} onChange={(v) => set('unit', v)} />
        </div>
        {form.quantity && form.unit && (
          <p className="text-xs text-orange-500 font-semibold mt-0.5">
            Vista previa: {form.quantity} {form.unit}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Código de barras</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.barcode}
            onChange={(e) => set('barcode', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Escaneá con el lector o tipeá el código"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
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
        <p className="text-xs text-gray-400 mt-0.5">
          Necesario para poder cobrarlo por escaneo en la sección Ventas. Si el producto no tiene código de fábrica, generá uno interno.
        </p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Producto activo</p>
          <p className="text-xs text-gray-400 mt-0.5">Si está desactivado, se mostrará sin stock en la tienda</p>
        </div>
        <ToggleSwitch
          checked={form.isActive}
          onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
        />
      </div>

      {error && <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
