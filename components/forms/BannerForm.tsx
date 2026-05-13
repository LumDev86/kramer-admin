'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner, banners } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';

interface Props {
  banner?: Banner;
}

export default function BannerForm({ banner }: Props) {
  const router = useRouter();
  const isEdit = !!banner;

  const [form, setForm] = useState({
    title:    banner?.title    ?? '',
    linkUrl:  banner?.linkUrl  ?? '',
    order:    String(banner?.order  ?? 0),
    isActive: banner?.isActive ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      if (form.title)   fd.append('title',   form.title);
      if (form.linkUrl) fd.append('linkUrl',  form.linkUrl);
      fd.append('order',    form.order);
      fd.append('isActive', String(form.isActive));
      if (image) fd.append('image', image);

      if (isEdit) {
        await banners.update(banner.id, fd);
      } else {
        await banners.create(fd);
      }
      router.push('/banners');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 max-w-xl">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Imagen {!isEdit && '*'}</label>
        <ImageUpload currentUrl={banner?.imageUrl} onChange={setImage} required={!isEdit} />
        <p className="text-xs text-gray-400">Tamaño recomendado: 1200×600px</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Título del banner (opcional)"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500">URL de destino</label>
        <input
          type="text"
          value={form.linkUrl}
          onChange={(e) => set('linkUrl', e.target.value)}
          placeholder="https://... (opcional)"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Orden</label>
          <input
            type="number"
            min="0"
            value={form.order}
            onChange={(e) => set('order', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Estado</label>
          <label className="flex items-center gap-2 h-10 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-sm font-semibold text-gray-700">Activo</span>
          </label>
        </div>
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
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear banner'}
        </button>
      </div>
    </form>
  );
}
