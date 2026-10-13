'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CaretRight, Camera, NotePencil, SpinnerGap, Warning } from '@phosphor-icons/react';
import { distribuidores, facturas, Factura } from '@/lib/api';
import { money } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Segmented from '@/components/ui/Segmented';
import Chip from '@/components/ui/Chip';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import AplicarAumentoModal from '@/components/ui/AplicarAumentoModal';
import ProductosDistribuidora from '@/components/distribuidoras/ProductosDistribuidora';
import NuevaCompraMenu from '@/components/distribuidoras/NuevaCompraMenu';
import CompraSueltaModal from '@/components/distribuidoras/CompraSueltaModal';
import { FACTURA_STATUS_LABEL, FACTURA_STATUS_TONE, facturaHref, fechaCorta, fechaGasto } from '@/components/distribuidoras/facturaUtils';
import { haceCuanto, minutosDesde } from '@/components/pedidos/pedidoUtils';
import { useF10 } from '@/lib/useF10';

type Tab = 'facturas' | 'productos';

export default function DistribuidoraDetallePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('facturas');
  const [showAumento, setShowAumento] = useState(false);
  const [showSuelto, setShowSuelto] = useState(false);

  // F10 = producto suelto, igual que "buscar producto" en Ventas
  useF10(() => setShowSuelto((o) => !o));

  const { data, isLoading, error } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });

  const { data: productos } = useQuery({
    queryKey: ['distribuidor', id, 'productos'],
    queryFn: () => distribuidores.getProductos(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['distribuidor', id] });
    qc.invalidateQueries({ queryKey: ['distribuidores'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('image', file);
      return facturas.create(id, form);
    },
    onSuccess: (factura) => {
      invalidate();
      // ?leyendo=1: el editor muestra los productos apareciendo de a uno
      router.push(`${facturaHref(id, factura.id)}?leyendo=1`);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo leer la factura', 'error'),
  });

  const manualMutation = useMutation({
    mutationFn: () => facturas.iniciarManual(id),
    onSuccess: (factura) => {
      invalidate();
      router.push(facturaHref(id, factura.id));
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo crear la factura', 'error'),
  });

  if (isLoading) {
    return (
      <>
        <div className="h-16 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </>
    );
  }

  if (!data) {
    return (
      <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">
        No se pudo cargar la distribuidora{error ? `: ${(error as Error).message}` : '.'}{' '}
        <Link href="/distribuidoras" className="text-kr-blue underline">Volver</Link>
      </p>
    );
  }

  const confirmadas = data.facturas.filter((f) => f.status === 'CONFIRMED');
  const pendientes = data.facturas.filter((f) => f.status === 'PENDING_REVIEW');
  const historial = data.facturas
    .filter((f) => f.status !== 'PENDING_REVIEW')
    .sort((a, b) => fechaGasto(b).localeCompare(fechaGasto(a)));

  const ahora = new Date();
  const delMes = confirmadas.filter((f) => {
    const d = new Date(fechaGasto(f));
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  });
  const gastadoMes = delMes.reduce((s, f) => s + Number(f.total), 0);
  const totalHistorico = confirmadas.reduce((s, f) => s + Number(f.total), 0);
  const porFecha = [...confirmadas].sort((a, b) => fechaGasto(a).localeCompare(fechaGasto(b)));
  const primera = porFecha[0];
  const ultima = porFecha[porFecha.length - 1];

  const ocupado = uploadMutation.isPending || manualMutation.isPending;

  return (
    <>
      <PageHeader
        back={{ href: '/distribuidoras', label: 'Distribuidoras' }}
        title={data.nombre}
        subtitle={[data.telefono ?? 'Sin teléfono', data.ivaDiscriminado ? 'IVA discriminado' : 'Precios con IVA incluido'].join(' · ')}
        actions={
          <>
            <Link href={`/distribuidoras/${id}/editar`} className={buttonClasses('secondary', 'md')}>
              Editar
            </Link>
            <NuevaCompraMenu
              disabled={ocupado}
              onEscanear={(f) => uploadMutation.mutate(f)}
              onManual={() => manualMutation.mutate()}
              onSuelto={() => setShowSuelto(true)}
            />
          </>
        }
      />

      {ocupado && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border-2 border-kr-navy bg-kr-yellow-soft px-4 py-3 font-extrabold animate-fadeIn">
          <SpinnerGap size={22} className="flex-shrink-0 animate-spin" />
          {uploadMutation.isPending ? 'La IA está leyendo la factura, puede tardar unos segundos…' : 'Creando la factura…'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Gastado este mes" value={money(gastadoMes)} sub={`${delMes.length} ${delMes.length === 1 ? 'factura' : 'facturas'}`} />
        <Stat
          label="Total histórico"
          value={money(totalHistorico)}
          sub={primera ? `desde ${new Date(fechaGasto(primera)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}` : 'sin compras todavía'}
        />
        <Stat
          className="col-span-2 lg:col-span-1"
          label="Última factura"
          value={ultima ? money(ultima.total) : '—'}
          sub={ultima ? `${fechaCorta(fechaGasto(ultima))} · ${haceCuanto(minutosDesde(fechaGasto(ultima), ahora.getTime()))}` : 'sin compras todavía'}
        />
      </div>

      {pendientes.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-kr-navy bg-kr-yellow-soft px-4 py-3">
          <Warning size={22} weight="fill" className="flex-shrink-0 text-kr-orange-dark" />
          <span className="min-w-[180px] flex-1 font-extrabold">
            Factura sin confirmar · {fechaCorta(f.createdAt)} · {f.items.length} {f.items.length === 1 ? 'producto' : 'productos'}
            {f.imageUrl ? ' · escaneada' : ''}
          </span>
          <Link href={facturaHref(id, f.id)} className={buttonClasses('secondary', 'md', '!bg-white !border-kr-navy')}>
            Seguir cargando
          </Link>
        </div>
      ))}

      <Segmented<Tab>
        ariaLabel="Secciones de la distribuidora"
        className="self-start"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'facturas', label: 'Facturas', count: historial.length },
          { value: 'productos', label: 'Productos', count: productos?.length },
        ]}
      />

      {tab === 'facturas' && <HistorialFacturas distribuidorId={id} facturas={historial} />}

      {tab === 'productos' && <ProductosDistribuidora distribuidorId={id} onAplicarAumento={() => setShowAumento(true)} />}

      {showSuelto && (
        <CompraSueltaModal
          distribuidorId={id}
          distribuidorNombre={data.nombre}
          onClose={() => setShowSuelto(false)}
          onRegistrada={invalidate}
        />
      )}

      {showAumento && (
        <AplicarAumentoModal
          distribuidorId={id}
          distribuidorNombre={data.nombre}
          onClose={() => setShowAumento(false)}
          onApplied={invalidate}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub, className = '' }: { label: string; value: string; sub: string; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 rounded-2xl border border-kr-line bg-white px-4 py-3 ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">{label}</span>
      <span className="font-display text-xl leading-tight tabular-nums text-kr-navy [overflow-wrap:anywhere] sm:text-2xl">{value}</span>
      <span className="text-[13px] font-bold text-kr-muted">{sub}</span>
    </div>
  );
}

const FILA_FACTURA =
  'grid items-center gap-x-3 gap-y-1 px-3 py-3 grid-cols-[minmax(0,1fr)_auto_20px] md:px-4 md:grid-cols-[96px_minmax(0,1fr)_96px_128px_120px_20px]';

function HistorialFacturas({ distribuidorId, facturas: lista }: { distribuidorId: string; facturas: Factura[] }) {
  return (
    <section aria-label="Historial de facturas" className="overflow-hidden rounded-2xl border border-kr-line bg-white">
      <div className={`${FILA_FACTURA} hidden border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted md:grid`}>
        <span>Fecha</span>
        <span>Origen</span>
        <span className="text-right">Productos</span>
        <span className="text-right">Total</span>
        <span>Estado</span>
        <span />
      </div>
      {lista.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">Todavía no hay facturas confirmadas.</p>
      ) : (
        <ul>
          {lista.map((f) => (
            <li key={f.id} className="border-b border-dashed border-kr-line last:border-b-0">
              <Link href={facturaHref(distribuidorId, f.id)} className={`${FILA_FACTURA} hover:bg-kr-paper`}>
                {/* celular: fecha + origen arriba, productos abajo; total y estado a la derecha */}
                <span className="flex min-w-0 flex-col md:contents">
                  <span className="font-extrabold tabular-nums">{fechaCorta(fechaGasto(f))}</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-kr-muted md:text-sm">
                    {f.imageUrl ? <Camera size={16} weight="bold" /> : <NotePencil size={16} weight="bold" />}
                    {f.imageUrl ? 'Escaneada' : 'A mano'}
                    <span className="md:hidden">· {f.items.length} {f.items.length === 1 ? 'producto' : 'productos'}</span>
                  </span>
                  <span className="hidden text-right font-bold tabular-nums text-kr-muted md:block">{f.items.length}</span>
                </span>
                <span className="flex flex-col items-end gap-1 md:contents">
                  <span className="text-right font-extrabold tabular-nums">{money(f.total)}</span>
                  <span><Chip tone={FACTURA_STATUS_TONE[f.status]}>{FACTURA_STATUS_LABEL[f.status]}</Chip></span>
                </span>
                <CaretRight size={18} weight="bold" className="text-kr-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
