'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category, categories } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';

interface Props {
  category?: Category;
}

export default function CategoryForm({ category }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState<string>(category?.parentId ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!category;

  const { data: topLevel } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const parentOptions = (topLevel?.data ?? []).filter((c) => c.id !== category?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('parentId', parentId);
      if (image) form.append('image', image);

      if (isEdit) {
        await categories.update(category.id, form);
      } else {
        await categories.create(form);
      }
      qc.invalidateQueries({ queryKey: ['categories'] });
      router.push('/categorias');
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 max-w-lg">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Nombre *</label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la categoría"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Categoría padre</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium bg-white text-gray-700"
        >
          <option value="">Sin categoría padre (top-level)</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Seleccioná una categoría padre para convertir esta en subcategoría.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Imagen {!isEdit && '*'}</label>
        <ImageUpload
          currentUrl={category?.imageUrl}
          onChange={setImage}
          required={!isEdit}
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
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
    </form>
  );
}
