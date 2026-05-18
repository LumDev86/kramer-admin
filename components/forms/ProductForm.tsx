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
    categoryId:  product?.categoryId                   ?? '',
    quantity:    product?.quantity != null ? String(product.quantity) : '',
    unit:        product?.unit                         ?? '',
    isActive:    product?.isActive                     ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      fd.append('stock',       '0');
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      if (form.quantity)   fd.append('quantity',   form.quantity);
      if (form.unit)       fd.append('unit',        form.unit);
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
          <label className="text-xs font-semibold text-gray-500">Precio *</label>
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
          <label className="text-xs font-semibold text-gray-500">Categoría</label>
          <CategorySelector
            value={form.categoryId}
            onChange={(v) => set('categoryId', v)}
            categories={catsData?.data ?? []}
            loading={!catsData}
          />
        </div>
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
