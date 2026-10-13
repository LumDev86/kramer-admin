'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Banner, banners } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Card from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Props {
  banner?: Banner;
}

export default function BannerForm({ banner }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!banner;

  const [form, setForm] = useState({
    title:    banner?.title    ?? '',
    linkUrl:  banner?.linkUrl  ?? '',
    order:    String(banner?.order  ?? 0),
    isActive: banner?.isActive ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      qc.invalidateQueries({ queryKey: ['banners'] });
      if (banner) qc.invalidateQueries({ queryKey: ['banner', banner.id] });
      toast.show(isEdit ? 'Cambios guardados' : 'Banner creado');
      router.push('/banners');
    } catch (err: any) {
      toast.show(err.message ?? 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <Card className="gap-4">
        <Field label={<>Imagen {isEdit && <span className="font-bold">(tocá para cambiarla)</span>}</>} hint="Tamaño recomendado: 1200 × 600 px.">
          <ImageUpload currentUrl={banner?.imageUrl} onChange={setImage} required={!isEdit} />
        </Field>

        <Field label="Título (opcional)" htmlFor="bf-titulo">
          <input id="bf-titulo" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Para reconocerlo en el panel" className={inputClasses()} />
        </Field>

        <Field label="A dónde lleva al tocarlo (opcional)" htmlFor="bf-link">
          <input id="bf-link" type="text" value={form.linkUrl} onChange={(e) => set('linkUrl', e.target.value)} placeholder="https://…" className={inputClasses()} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Posición" htmlFor="bf-orden" hint="También se ordena arrastrando en la lista.">
            <input id="bf-orden" type="number" inputMode="numeric" min="0" value={form.order} onChange={(e) => set('order', e.target.value)} className={inputClasses('no-spin')} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold text-kr-muted">Se ve en la tienda</span>
            <div className="flex min-h-11 items-center gap-2.5">
              <ToggleSwitch label="Se ve en la tienda" checked={form.isActive} onChange={() => set('isActive', !form.isActive)} />
              <span className="text-sm font-extrabold">{form.isActive ? 'Sí' : 'No, oculto'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-1">
          <span className="flex-1" />
          <button type="button" onClick={() => router.back()} className={buttonClasses('secondary', 'md')}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className={buttonClasses('primary', 'md', 'min-w-36')}>
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear banner'}
          </button>
        </div>
      </Card>
    </form>
  );
}
