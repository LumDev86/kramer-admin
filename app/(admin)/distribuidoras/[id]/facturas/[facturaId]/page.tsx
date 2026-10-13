'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { MagnifyingGlassPlus, SpinnerGap, Warning } from '@phosphor-icons/react';
import { distribuidores, facturas, products, categories } from '@/lib/api';
import { money } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Chip from '@/components/ui/Chip';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ImageLightbox from '@/components/ui/ImageLightbox';
import StickyActionBar from '@/components/ui/StickyActionBar';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import FacturaItemRow from '@/components/distribuidoras/FacturaItemRow';
import AgregarLineaManual from '@/components/distribuidoras/AgregarLineaManual';
import AgregarProductoAFactura from '@/components/distribuidoras/AgregarProductoAFactura';
import FacturaManualItemsTable from '@/components/distribuidoras/FacturaManualItemsTable';
import { FACTURA_STATUS_LABEL, FACTURA_STATUS_TONE, fechaCorta } from '@/components/distribuidoras/facturaUtils';

export default function FacturaEditorPage() {
  return (
    <Suspense>
      <FacturaEditor />
    </Suspense>
  );
}

function FacturaEditor() {
  const { id, facturaId } = useParams() as { id: string; facturaId: string };
  const leyendo = useSearchParams().get('leyendo') === '1';
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // recién escaneada: los productos aparecen de a uno, como si la IA los fuera leyendo
  const [revealCount, setRevealCount] = useState(leyendo ? 0 : Infinity);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [priceUpdateError, setPriceUpdateError] = useState<{ productId: string; message: string } | null>(null);
  // sin esto, actualizar el precio no daba ningún indicio visible de éxito más allá de un
  // texto chico ("Precio de venta actual") que es fácil de no notar - si el navegador
  // descargó la pestaña en segundo plano y el usuario volvió horas después con el input ya
  // reseteado a su valor por defecto, el click igual "funcionaba" pero grababa el mismo precio
  // de siempre, y sin este aviso quedaba indistinguible de un click que no hizo nada
  const [priceUpdateSuccess, setPriceUpdateSuccess] = useState<{ productId: string; price: number } | null>(null);

  // se usa la misma query que el detalle de la distribuidora: lo que se cambia acá se ve allá sin recargar
  const { data, isLoading } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });
  const factura = data?.facturas.find((f) => f.id === facturaId) ?? null;
  const pendiente = factura?.status === 'PENDING_REVIEW';
  const escaneada = !!factura?.imageUrl;
  // la revisión con vinculación (sugerencias, crear producto) es solo para una escaneada sin confirmar;
  // el resto (a mano, o ya confirmada) se edita en la tabla completa
  const revisionEscaneada = pendiente && escaneada;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['distribuidor', id] });
    qc.invalidateQueries({ queryKey: ['distribuidores'] });
    qc.invalidateQueries({ queryKey: ['factura', 'suggestions'] });
  };

  const { data: suggestions } = useQuery({
    queryKey: ['factura', 'suggestions', facturaId],
    queryFn: () => facturas.getSuggestions(facturaId),
    enabled: !!revisionEscaneada,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data: itemData }: { itemId: string; data: any }) => facturas.updateItem(facturaId, itemId, itemData),
    onSuccess: invalidate,
    onError: (err: any) => toast.show(err.message ?? 'No se pudo guardar el cambio', 'error'),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => facturas.removeItem(facturaId, itemId),
    onSuccess: invalidate,
    onError: (err: any) => toast.show(err.message ?? 'No se pudo quitar el producto', 'error'),
  });

  const updateProductPriceMutation = useMutation({
    mutationFn: ({ productId, price }: { productId: string; price: number }) => {
      const form = new FormData();
      form.append('price', String(price));
      return products.update(productId, form);
    },
    onSuccess: (_data, { productId, price }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['products'] });
      setPriceUpdateError(null);
      setPriceUpdateSuccess({ productId, price });
    },
    // sin esto, un fallo (red, sesión vencida, server caído) dejaba el click sin ningún efecto
    // visible - el botón "no hacía nada" en vez de avisar qué pasó
    onError: (err: any, { productId }) => {
      setPriceUpdateSuccess(null);
      setPriceUpdateError({ productId, message: err.message ?? 'No se pudo actualizar el precio' });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => facturas.confirm(facturaId),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.show('Factura confirmada: se actualizaron los costos');
      router.push(`/distribuidoras/${id}`);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo confirmar la factura', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => facturas.cancel(facturaId),
    onSuccess: () => {
      invalidate();
      toast.show('Factura descartada');
      router.push(`/distribuidoras/${id}`);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo descartar la factura', 'error'),
  });

  const itemCount = factura?.items.length ?? 0;
  useEffect(() => {
    if (revealCount >= itemCount) return;
    const timer = setTimeout(() => setRevealCount((c) => c + 1), 220);
    return () => clearTimeout(timer);
  }, [revealCount, itemCount]);

  if (isLoading) {
    return (
      <>
        <div className="h-16 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </>
    );
  }

  if (!data || !factura) {
    return (
      <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">
        No se encontró esta factura.{' '}
        <Link href={`/distribuidoras/${id}`} className="text-kr-blue underline">Volver a la distribuidora</Link>
      </p>
    );
  }

  const unresolvedCount = factura.items.filter((i) => !i.productId).length;
  const cancelada = factura.status === 'CANCELLED';
  const confirmada = factura.status === 'CONFIRMED';

  const items = (
    <section aria-label="Productos de la factura" className="min-w-0 overflow-hidden rounded-2xl border border-kr-line bg-white">
      {revisionEscaneada ? (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_76px_112px_120px_44px] gap-x-3 border-b border-kr-line bg-kr-paper px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-kr-muted md:grid">
            <span>Producto leído</span>
            <span className="text-right">Cant.</span>
            <span className="text-right">Costo</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>
          {factura.items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">La IA no encontró productos. Agregalos a mano abajo.</p>
          ) : (
            <ul>
              {factura.items.slice(0, revealCount).map((item) => (
                <FacturaItemRow
                  key={item.id}
                  item={item}
                  facturaId={factura.id}
                  suggestions={suggestions?.[item.id] ?? []}
                  categories={catsData?.data ?? []}
                  categoriesLoading={!catsData}
                  onUpdate={(itemData) => updateItemMutation.mutate({ itemId: item.id, data: itemData })}
                  onRemove={() => removeItemMutation.mutate(item.id)}
                  onVincular={(product, precio) => {
                    updateItemMutation.mutate({ itemId: item.id, data: { productId: product.id } });
                    const newPrice = parseFloat(precio);
                    if (!isNaN(newPrice) && newPrice > 0 && newPrice !== Number(product.price)) {
                      updateProductPriceMutation.mutate({ productId: product.id, price: newPrice });
                    }
                  }}
                  onActualizarPrecioProducto={(productId, price) => updateProductPriceMutation.mutate({ productId, price })}
                  actualizandoPrecio={updateProductPriceMutation.isPending}
                  errorActualizarPrecio={
                    item.product && priceUpdateError?.productId === item.product.id ? priceUpdateError.message : undefined
                  }
                  precioActualizado={
                    item.product && priceUpdateSuccess?.productId === item.product.id ? priceUpdateSuccess.price : undefined
                  }
                  onProductCreated={invalidate}
                />
              ))}
              {revealCount < factura.items.length && (
                <li className="flex items-center gap-2 px-4 py-3 text-sm font-extrabold text-kr-blue animate-fadeIn">
                  <SpinnerGap size={18} className="animate-spin" />
                  Leyendo productos… ({revealCount}/{factura.items.length})
                </li>
              )}
            </ul>
          )}
          <div className="border-t border-kr-line p-3 md:px-4">
            <AgregarLineaManual facturaId={factura.id} onAdded={invalidate} />
          </div>
        </>
      ) : (
        <FacturaManualItemsTable
          facturaId={factura.id}
          items={factura.items}
          onChanged={invalidate}
          // el backend solo deja quitar líneas de una factura sin confirmar
          allowRemove={pendiente}
          readOnly={cancelada}
          ivaDiscriminado={data.ivaDiscriminado}
        />
      )}
    </section>
  );

  return (
    <>
      <PageHeader
        back={{ href: `/distribuidoras/${id}`, label: data.nombre }}
        title={`Factura del ${fechaCorta(factura.createdAt)}`}
        badges={<Chip tone={FACTURA_STATUS_TONE[factura.status]}>{FACTURA_STATUS_LABEL[factura.status]}</Chip>}
        subtitle={`${escaneada ? 'Escaneada' : 'Cargada a mano'} · ${new Date(factura.createdAt).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
      />

      {factura.extractionError && (
        <p className="flex items-start gap-2 rounded-2xl border-2 border-kr-navy bg-kr-yellow-soft px-4 py-3 text-sm font-bold">
          <Warning size={20} weight="fill" className="flex-shrink-0 text-kr-orange-dark" />
          No se pudo leer la factura automáticamente ({factura.extractionError}). Cargá los productos a mano.
        </p>
      )}
      {cancelada && (
        <p className="rounded-2xl bg-kr-sand px-4 py-3 text-sm font-bold text-kr-muted">Esta factura está cancelada: se puede ver pero no editar.</p>
      )}
      {confirmada && (
        <p className="rounded-2xl bg-kr-sand px-4 py-3 text-sm font-bold text-kr-muted">
          Ya está confirmada. Podés corregir cantidades, costos y precios, o agregar algo que faltó cargar.
        </p>
      )}

      {/* a mano o confirmada: arriba el campo para escanear/buscar y sumar productos */}
      {!revisionEscaneada && !cancelada && (
        <AgregarProductoAFactura
          facturaId={factura.id}
          distribuidorId={id}
          categories={catsData?.data ?? []}
          categoriesLoading={!catsData}
          onAdded={invalidate}
        />
      )}

      {escaneada ? (
        <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => setLightboxUrl(factura.imageUrl)}
            className="group relative hidden aspect-[3/4] w-full overflow-hidden rounded-2xl border border-kr-line bg-white lg:block lg:sticky lg:top-7"
            aria-label="Ver la foto de la factura en grande"
          >
            <Image src={factura.imageUrl!} alt="Foto de la factura" fill sizes="240px" className="object-contain p-2" />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border-[1.5px] border-kr-navy bg-white px-2 py-1 text-xs font-extrabold">
              <MagnifyingGlassPlus size={14} weight="bold" />
              Ampliar
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLightboxUrl(factura.imageUrl)}
            className={buttonClasses('secondary', 'sm', 'self-start lg:hidden')}
          >
            <MagnifyingGlassPlus size={16} weight="bold" />
            Ver la foto de la factura
          </button>
          {items}
        </div>
      ) : (
        items
      )}

      {/* en celular "Descartar" no entra en la barra: queda acá, lejos del botón de confirmar */}
      {pendiente && (
        <button type="button" onClick={() => setConfirmCancel(true)} className={buttonClasses('danger', 'md', 'self-start sm:hidden')}>
          Descartar factura
        </button>
      )}

      <StickyActionBar tone="navy">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-extrabold text-kr-side-text">
            {factura.items.length} {factura.items.length === 1 ? 'producto' : 'productos'} · total de la factura
          </span>
          <span className="font-display text-2xl leading-tight tabular-nums">{money(factura.total)}</span>
          {pendiente && unresolvedCount > 0 && (
            <span className="text-xs font-extrabold text-kr-yellow">
              Falta vincular {unresolvedCount} {unresolvedCount === 1 ? 'producto' : 'productos'}
            </span>
          )}
        </div>
        <span className="flex-1" />
        {pendiente ? (
          <>
            <button type="button" onClick={() => setConfirmCancel(true)} className={buttonClasses('secondary', 'md', 'hidden sm:inline-flex')}>
              Descartar
            </button>
            <button
              type="button"
              onClick={() => confirmMutation.mutate()}
              disabled={factura.items.length === 0 || unresolvedCount > 0 || confirmMutation.isPending}
              title={unresolvedCount > 0 ? 'Vinculá o creá los productos que faltan para poder confirmar' : undefined}
              className={buttonClasses('success', 'md')}
            >
              {confirmMutation.isPending ? 'Confirmando…' : 'Confirmar factura'}
            </button>
          </>
        ) : (
          <Link href={`/distribuidoras/${id}`} className={buttonClasses('secondary', 'md')}>
            Listo
          </Link>
        )}
      </StickyActionBar>

      {confirmCancel && (
        <ConfirmModal
          message="¿Descartar esta factura? Se pierden los productos cargados."
          confirmLabel="Descartar factura"
          loading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
          onCancel={() => setConfirmCancel(false)}
        />
      )}

      {lightboxUrl && <ImageLightbox imageUrl={lightboxUrl} alt="Factura" onClose={() => setLightboxUrl(null)} />}
    </>
  );
}
