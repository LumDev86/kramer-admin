'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Barcode, MagnifyingGlass, SpinnerGap, X } from '@phosphor-icons/react';
import { Product, products, categories, ImageSearchResult } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import UnitSelector from '@/components/ui/UnitSelector';
import CategorySelector from '@/components/ui/CategorySelector';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Card, { CardTitle } from '@/components/ui/Card';
import Field, { inputClasses } from '@/components/ui/Field';
import StickyActionBar from '@/components/ui/StickyActionBar';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import PrecioCard from '@/components/productos/PrecioCard';
import { useFotoDeBusqueda } from '@/lib/useFotoDeBusqueda';

interface Props {
  product?: Product;
}

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!product;

  const [form, setForm] = useState({
    title:       product?.title                        ?? '',
    description: product?.description                  ?? '',
    price:       product?.price                        ?? '',
    cost:        product?.cost                         ?? '',
    categoryId:  product?.categoryId                   ?? '',
    quantity:    product?.quantity != null ? String(product.quantity) : '',
    unit:        product?.unit                         ?? '',
    barcode:     product?.barcode                      ?? '',
    isActive:    product?.isActive                     ?? true,
  });
  const [image, setImage] = useState<File | null>(null);
  const { aiImageUrl, setAiImageUrl, fotoBuscada, uploadKey, bajandoFoto, elegirFoto } = useFotoDeBusqueda(setImage);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[] | null>(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('price',       form.price);
      fd.append('cost',        form.cost);
      if (!isEdit) fd.append('stock', '0');
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      if (form.quantity)   fd.append('quantity',   form.quantity);
      if (form.unit)       fd.append('unit',        form.unit);
      if (form.barcode)    fd.append('barcode',     form.barcode);
      fd.append('isActive', String(form.isActive));
      if (image) fd.append('image', image);
      else if (aiImageUrl) fd.append('imageSourceUrl', aiImageUrl);

      if (isEdit) {
        await products.update(product.id, fd);
        qc.invalidateQueries({ queryKey: ['product', product.id] });
      } else {
        await products.create(fd);
      }
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.show(isEdit ? 'Cambios guardados' : 'Producto creado');
      router.push('/productos');
    } catch (err: any) {
      toast.show(err.message ?? 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await products.delete(product.id);
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.show(`Se eliminó "${product.title}"`);
      router.push('/productos');
    } catch (err: any) {
      setDeleteError(err.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleImageSearch = async () => {
    const q = form.title.trim();
    if (!q) return;
    setImageSearchLoading(true);
    try {
      const results = await products.imageSearch(q);
      setImageSearchResults(results);
    } catch (err: any) {
      toast.show(err.message ?? 'Error al buscar imágenes', 'error');
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const code = await products.generateUniqueBarcode();
      set('barcode', code);
    } catch (err: any) {
      toast.show(err.message ?? 'Error al generar el código', 'error');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const botonIA = (
    <button
      type="button"
      disabled={!form.title.trim() || imageSearchLoading}
      onClick={handleImageSearch}
      title={!form.title.trim() ? 'Escribí el nombre del producto primero' : undefined}
      className={buttonClasses('secondary', 'sm', '!border-kr-blue !text-kr-blue')}
    >
      <MagnifyingGlass size={16} weight="bold" />
      {imageSearchLoading ? 'Buscando…' : 'Buscar foto con IA'}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card aria-labelledby="h-datos" className="gap-4">
          <CardTitle id="h-datos">Datos del producto</CardTitle>

          <div className="flex flex-col gap-2.5">
            {aiImageUrl ? (
              <div className="flex items-center gap-3.5">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-[1.5px] border-kr-blue bg-kr-sand sm:h-30 sm:w-30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aiImageUrl} alt="Foto elegida" className="h-full w-full object-contain p-2" />
                  <button
                    type="button"
                    aria-label="Quitar la foto"
                    onClick={() => setAiImageUrl(null)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-kr-navy bg-white hover:bg-[#FFE7D6]"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <p className="text-[13px] font-bold text-kr-muted">Foto elegida de la búsqueda. Se guarda al guardar el producto.</p>
                  <button type="button" onClick={() => setAiImageUrl(null)} className={buttonClasses('secondary', 'sm')}>
                    Usar otra foto
                  </button>
                </div>
              </div>
            ) : (
              <ImageUpload
                key={uploadKey}
                compact
                currentUrl={product?.imageUrl}
                initialFile={fotoBuscada}
                onChange={setImage}
                required={!isEdit}
                withBgRemoval
                extraActions={botonIA}
              />
            )}

            {!aiImageUrl && imageSearchResults && imageSearchResults.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-extrabold text-kr-muted">Elegí una foto:</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {imageSearchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Usar la foto ${i + 1}`}
                      disabled={bajandoFoto !== null}
                      onClick={async () => { await elegirFoto(r.imageUrl, i); setImageSearchResults(null); }}
                      className="relative aspect-square w-full overflow-hidden rounded-xl border-[1.5px] border-kr-line bg-kr-paper transition-colors hover:border-kr-blue disabled:cursor-wait"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      {bajandoFoto === i && (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                          <SpinnerGap size={22} className="animate-spin text-kr-blue" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!aiImageUrl && imageSearchResults && imageSearchResults.length === 0 && (
              <p className="text-[13px] font-bold text-kr-muted">No se encontraron fotos para ese nombre.</p>
            )}
          </div>

          <Field label="Nombre" htmlFor="pf-nombre">
            <input
              id="pf-nombre"
              required
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Nombre del producto"
              className={inputClasses()}
            />
          </Field>

          <Field
            label="Código de barras"
            htmlFor="pf-codigo"
            hint="Hace falta para cobrarlo escaneando en Ventas. Si no tiene código de fábrica, generá uno interno."
          >
            <div className="flex gap-2">
              <input
                id="pf-codigo"
                type="text"
                inputMode="numeric"
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                // el lector de códigos manda un Enter al final: no tiene que guardar el formulario
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Escaneá con el lector o tipeá el código"
                className={inputClasses('flex-1 tabular-nums')}
              />
              <button type="button" disabled={generatingBarcode} onClick={handleGenerateBarcode} className={buttonClasses('secondary', 'md', 'flex-shrink-0')}>
                <Barcode size={18} weight="bold" />
                <span className="hidden sm:inline">{generatingBarcode ? 'Generando…' : 'Generar código'}</span>
                <span className="sm:hidden">{generatingBarcode ? '…' : 'Generar'}</span>
              </button>
            </div>
          </Field>

          <Field label="Descripción" htmlFor="pf-desc">
            <textarea
              id="pf-desc"
              required
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descripción del producto"
              className={inputClasses('min-h-20 resize-y')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Categoría" htmlFor="pf-cat" className="col-span-2 sm:col-span-1">
              <CategorySelector
                id="pf-cat"
                value={form.categoryId}
                onChange={(v) => set('categoryId', v)}
                categories={catsData?.data ?? []}
                loading={!catsData}
              />
            </Field>
            <Field label="Cantidad" htmlFor="pf-cant">
              <input
                id="pf-cant"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="500"
                className={inputClasses('no-spin')}
              />
            </Field>
            <Field label="Medida" htmlFor="pf-unidad">
              <UnitSelector id="pf-unidad" value={form.unit} onChange={(v) => set('unit', v)} className="w-full" />
            </Field>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <PrecioCard cost={form.cost} price={form.price} onCost={(v) => set('cost', v)} onPrice={(v) => set('price', v)} />

          <Card aria-labelledby="h-visible">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <CardTitle id="h-visible">Disponible en la tienda</CardTitle>
                <p className="mt-0.5 text-[13px] font-bold text-kr-muted">Si lo apagás, el producto aparece como sin stock en la tienda.</p>
              </div>
              <ToggleSwitch
                label="Disponible en la tienda"
                checked={form.isActive}
                onChange={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              />
            </div>
          </Card>
        </div>
      </div>

      <StickyActionBar>
        {isEdit && (
          <button type="button" onClick={() => { setConfirmDelete(true); setDeleteError(''); }} className={buttonClasses('danger', 'md')}>
            Eliminar
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => router.back()} className={buttonClasses('secondary', 'md', 'hidden sm:inline-flex')}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className={buttonClasses('primary', 'md', 'flex-1 sm:flex-none sm:min-w-44')}>
          {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </StickyActionBar>

      {confirmDelete && product && (
        <ConfirmModal
          message={`¿Eliminar "${product.title}"? Esta acción no se puede deshacer.`}
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </form>
  );
}
