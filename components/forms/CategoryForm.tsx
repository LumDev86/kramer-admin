'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Category, categories } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import Card from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Props {
  category?: Category;
  initialParentId?: string; // viene del URL ?parentId=X al crear subcategoría
}

export default function CategoryForm({ category, initialParentId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState<string>(
    initialParentId ?? category?.parentId ?? ''
  );
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const isEdit = !!category;
  const hasChildren = (category?.children?.length ?? 0) > 0;
  const parentIsLocked = !!initialParentId; // viene del flujo "Nueva subcategoría de X"

  // Solo cargamos las top-level si el selector de padre es visible
  const showParentSelector = !hasChildren;

  const { data: topLevel } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
    enabled: showParentSelector,
  });

  const parentOptions = (topLevel?.data ?? []).filter((c) => c.id !== category?.id);
  const selectedParentName = parentOptions.find((c) => c.id === parentId)?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      qc.invalidateQueries({ queryKey: ['categories-all'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['category', category.id] });
      toast.show(isEdit ? 'Cambios guardados' : parentId ? 'Subcategoría creada' : 'Categoría creada');
      router.push('/categorias');
    } catch (err: any) {
      toast.show(err.message ?? 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <Card className="gap-4">
        <Field label="Nombre" htmlFor="cf-nombre">
          <input
            id="cf-nombre"
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={parentId ? 'Nombre de la subcategoría' : 'Nombre de la categoría'}
            className={inputClasses()}
          />
        </Field>

        {/* Padre fijo cuando viene del botón "Subcategoría" */}
        {parentIsLocked && (
          <Field label="Va dentro de">
            <p className="rounded-xl border-[1.5px] border-kr-navy bg-kr-yellow-soft px-3 py-2.5 text-[15px] font-extrabold">
              {selectedParentName ?? '…'}
            </p>
          </Field>
        )}

        {/* Selector editable solo al editar una categoría sin hijos */}
        {isEdit && showParentSelector && !parentIsLocked && (
          <Field label="Va dentro de" htmlFor="cf-padre" hint="Elegí una categoría para convertir esta en subcategoría.">
            <select id="cf-padre" value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClasses()}>
              <option value="">Ninguna (es una categoría principal)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Aviso si tiene subcategorías propias */}
        {hasChildren && (
          <p className="rounded-xl bg-kr-yellow-soft px-3 py-2.5 text-[13px] font-bold">
            Esta categoría tiene subcategorías, así que no puede ir dentro de otra.
          </p>
        )}

        <Field label={<>Imagen {!isEdit && !parentId ? '' : <span className="font-bold">(opcional)</span>}</>}>
          <ImageUpload currentUrl={category?.imageUrl} onChange={setImage} required={!isEdit && !parentId} />
        </Field>

        <div className="flex gap-2.5 pt-1">
          <button type="button" onClick={() => router.back()} className={buttonClasses('secondary', 'md', 'flex-1')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className={buttonClasses('primary', 'md', 'flex-1')}>
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </Card>
    </form>
  );
}
