'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { pedidos, repartidores as repartidoresApi, config, PedidoItem, PedidoStatus } from '@/lib/api';
import { Bicycle, CaretRight, WhatsappLogo, WarningCircle, XCircle } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import StickyActionBar from '@/components/ui/StickyActionBar';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { estaEnLinea, distanciaKm } from '@/lib/geo';
import { money, formatDateTime, waLink, PEDIDO_STATUS_LABEL, PAYMENT_LABEL } from '@/lib/format';
import { esEnvio, haceCuanto, hora, minutosDesde, STATUS_TONE, useAhora } from '@/components/pedidos/pedidoUtils';
import EditarItemModal, { ModoEdicion } from '@/components/pedidos/EditarItemModal';

// Leaflet necesita `window` - no puede renderizarse en el servidor
const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const CLIENT_URL = 'https://kramer-client.vercel.app';

const ASIGNACION_LABEL: Record<string, string> = {
  PENDIENTE: 'Esperando respuesta',
  ACEPTADO: 'Aceptó',
  RECHAZADO: 'Rechazó',
};

const SIGUIENTE: Partial<Record<PedidoStatus, { label: string; status: PedidoStatus }>> = {
  NUEVO: { label: 'Marcar en preparación', status: 'EN_PREPARACION' },
  EN_PREPARACION: { label: 'Marcar en camino', status: 'EN_CAMINO' },
  EN_CAMINO: { label: 'Marcar entregado', status: 'ENTREGADO' },
};

const PASOS: { status: PedidoStatus; label: string }[] = [
  { status: 'NUEVO', label: 'Nuevo' },
  { status: 'EN_PREPARACION', label: 'En preparación' },
  { status: 'EN_CAMINO', label: 'En camino' },
  { status: 'ENTREGADO', label: 'Entregado' },
];

export default function PedidoDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();
  const toast = useToast();
  const now = useAhora();
  const [toCancel, setToCancel] = useState(false);
  const [editando, setEditando] = useState<{ item: PedidoItem; modo: ModoEdicion } | null>(null);

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidos.getById(id),
    refetchInterval: 10000,
  });

  const { data: listaRepartidores } = useQuery({
    queryKey: ['repartidores'],
    queryFn: () => repartidoresApi.getAll(),
    refetchInterval: 10000, // los pines del mapa se mueven, no alcanza con traerlos una sola vez
  });

  const { data: storeConfig } = useQuery({ queryKey: ['store-config'], queryFn: config.get });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pedido', id] });
    qc.invalidateQueries({ queryKey: ['pedidos'] });
  };
  const onError = (err: any) => toast.show(err?.message ?? 'No se pudo guardar el cambio', 'error');

  const estadoMutation = useMutation({
    mutationFn: (status: PedidoStatus) => pedidos.actualizarEstado(id, status),
    onSuccess: (p) => { invalidate(); toast.show(`Pedido ${PEDIDO_STATUS_LABEL[p.status].toLowerCase()}`); },
    onError,
  });

  const asignarMutation = useMutation({
    mutationFn: (repartidorId: string) => pedidos.asignar(id, repartidorId),
    onSuccess: (p) => { invalidate(); toast.show(`Asignado a ${p.repartidor?.nombre ?? 'repartidor'}`); },
    onError,
  });

  const cancelarMutation = useMutation({
    mutationFn: () => pedidos.cancelar(id),
    onSuccess: () => {
      invalidate();
      setToCancel(false);
      toast.show('Pedido cancelado');
    },
    onError,
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-kr-orange border-t-transparent rounded-full animate-spin" />;
  }
  if (!pedido) return <p className="text-sm font-bold text-kr-muted">Pedido no encontrado.</p>;

  const trackingUrl = `${CLIENT_URL}/pedido/${pedido.trackingToken}`;
  const mensajesPorEstado: Partial<Record<PedidoStatus, string>> = {
    EN_PREPARACION: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} está en preparación 👨‍🍳. Podés seguirlo acá: ${trackingUrl}`,
    EN_CAMINO: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} está en camino 🛵. Cuando lo recibas, respondé este mensaje con "recibido". Podés seguirlo acá: ${trackingUrl}`,
    ENTREGADO: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} fue entregado. ¡Gracias por tu compra! 🎉`,
    CANCELADO: `Hola ${pedido.nombreCliente}, tu pedido ${pedido.numero} fue cancelado. Cualquier consulta, escribinos por acá.`,
  };

  const activos = listaRepartidores?.filter((r) => r.isActive) ?? [];
  const destinoPedido =
    pedido.destinoLat != null && pedido.destinoLng != null
      ? { lat: pedido.destinoLat, lng: pedido.destinoLng }
      : null;
  // en línea primero (mismo criterio que el mapa, ver lib/geo.ts), y dentro de cada grupo el
  // orden alfabético que ya trae el server (orderBy nombre) se mantiene porque sort es estable
  const repartidoresOrdenados = [...activos].sort(
    (a, b) => Number(estaEnLinea(b)) - Number(estaEnLinea(a))
  );
  const esFinal = pedido.status === 'ENTREGADO' || pedido.status === 'CANCELADO';
  const siguiente = SIGUIENTE[pedido.status];
  const envio = pedido.items.find(esEnvio);
  const productos = pedido.items.filter((i) => !esEnvio(i));
  const mensajeWa = mensajesPorEstado[pedido.status];
  // mismo criterio que el server (ESTADOS_EDITABLES en pedido.service.ts): una vez que sale ya no se toca
  const editable = pedido.status === 'NUEVO' || pedido.status === 'EN_PREPARACION';
  const diferencia = pedido.totalOriginal !== null ? Number(pedido.total) - Number(pedido.totalOriginal) : 0;
  const accion = 'text-[13px] font-extrabold text-kr-blue hover:text-kr-navy';

  const horaPaso: Record<PedidoStatus, string | null> = {
    NUEVO: pedido.createdAt,
    EN_PREPARACION: pedido.enPreparacionAt,
    EN_CAMINO: pedido.enCaminoAt,
    ENTREGADO: pedido.entregadoAt,
    CANCELADO: pedido.canceladoAt,
  };
  const pasoActual = PASOS.findIndex((p) => p.status === pedido.status);

  return (
    <>
      <PageHeader
        back={{ href: '/pedidos', label: 'Pedidos' }}
        title={`Pedido ${pedido.numero}`}
        badges={
          <>
            <Chip tone={STATUS_TONE[pedido.status]} className="text-[13px]">{PEDIDO_STATUS_LABEL[pedido.status]}</Chip>
            <span className="text-sm font-extrabold text-kr-muted">
              {esFinal ? formatDateTime(pedido.createdAt) : `entró ${haceCuanto(minutosDesde(pedido.createdAt, now))}`}
            </span>
          </>
        }
      />

      {pedido.status === 'CANCELADO' ? (
        <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-kr-line bg-[#EEE9DE] px-4 py-3 font-extrabold text-kr-muted">
          <XCircle size={20} weight="fill" />
          Pedido cancelado{pedido.canceladoAt ? ` a las ${hora(pedido.canceladoAt)}` : ''}.
        </div>
      ) : (
        <ol aria-label="Pasos del pedido" className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {PASOS.map((p, i) => {
            const done = i < pasoActual || pedido.status === 'ENTREGADO';
            const cur = i === pasoActual && pedido.status !== 'ENTREGADO';
            const t = horaPaso[p.status];
            return (
              <li
                key={p.status}
                aria-current={cur ? 'step' : undefined}
                className={`flex flex-col gap-1.5 text-[11px] font-extrabold sm:text-[13px] ${done ? 'text-kr-green-dark' : cur ? 'text-kr-navy' : 'text-kr-muted'}`}
              >
                <span className={`h-2 rounded ${done ? 'bg-kr-green-dark' : cur ? 'bg-kr-orange' : 'bg-kr-line'}`} />
                {p.label}
                <small className="hidden text-xs font-bold text-kr-muted sm:block">{t ? hora(t) : '—'}</small>
              </li>
            );
          })}
        </ol>
      )}

      {pedido.distanciaKm === null && (
        <div className="flex items-start gap-3 rounded-2xl border-[1.5px] border-kr-orange-dark/40 bg-[#FFE7D6] px-4 py-3.5">
          <WarningCircle size={22} weight="fill" className="mt-0.5 flex-shrink-0 text-kr-orange-dark" />
          <div>
            <p className="font-extrabold text-kr-orange-dark">Envío estimado, no confirmado</p>
            <p className="mt-0.5 text-sm font-bold text-kr-navy">
              No se pudo ubicar &quot;{pedido.direccion}&quot; en el mapa, así que se cobró la tarifa base de envío
              {envio && <> ({money(envio.subtotal)})</>}, sin distancia real ni recargo por cruzar las vías.
              Confirmá con el cliente y corregí el cobro si hace falta.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card aria-labelledby="h-prod">
            <CardTitle id="h-prod">Productos</CardTitle>
            <ul>
              {productos.map((item) => (
                <li key={item.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-dashed border-kr-line py-2">
                  <span className="rounded-lg bg-kr-sand py-0.5 text-center font-extrabold tabular-nums">{item.quantity}×</span>
                  <span className="font-extrabold leading-snug">
                    {item.name}
                    <span className="block text-xs font-bold text-kr-muted">{money(item.unitPrice)} c/u</span>
                    {item.nombreOriginal && (
                      <span className="block text-xs font-bold text-kr-orange-dark">Cambiado · antes: {item.nombreOriginal}</span>
                    )}
                    {editable && (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <button type="button" onClick={() => setEditando({ item, modo: 'cambiar' })} className={accion}>Cambiar</button>
                        <button type="button" onClick={() => setEditando({ item, modo: 'cantidad' })} className={accion}>Cantidad</button>
                        {productos.length > 1 && (
                          <button type="button" onClick={() => setEditando({ item, modo: 'quitar' })} className={`${accion} !text-kr-orange-dark`}>Quitar</button>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="text-right font-extrabold tabular-nums whitespace-nowrap">{money(item.subtotal)}</span>
                </li>
              ))}
              {envio && (
                <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-dashed border-kr-line py-2 text-kr-muted">
                  <span />
                  <span className="font-extrabold">Envío</span>
                  <span className="text-right font-extrabold tabular-nums whitespace-nowrap">{money(envio.subtotal)}</span>
                </li>
              )}
            </ul>
            <div className="flex items-baseline justify-between font-display text-[26px] leading-none">
              <span>Total</span>
              <span className="tabular-nums">{money(pedido.total)}</span>
            </div>
            {diferencia !== 0 && (
              <p className="rounded-xl bg-kr-yellow-soft px-3 py-2 text-sm font-bold">
                Se cambiaron productos: el total pasó de {money(pedido.totalOriginal!)} a {money(pedido.total)} (
                {diferencia > 0 ? `${money(diferencia)} más` : `${money(-diferencia)} menos`}).
                {pedido.paymentMethod === 'TRANSFER' && ' Si ya pagó por transferencia, arreglá la diferencia con el cliente.'}
              </p>
            )}
          </Card>

          <Card aria-labelledby="h-pago">
            <CardTitle id="h-pago">Pago</CardTitle>
            <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className="font-extrabold text-kr-muted">Método</dt>
              <dd className="font-extrabold">{PAYMENT_LABEL[pedido.paymentMethod]}</dd>
              {pedido.distanciaKm !== null && (
                <>
                  <dt className="font-extrabold text-kr-muted">Distancia</dt>
                  <dd className="font-extrabold">
                    {pedido.distanciaKm.toFixed(1)} km{pedido.cruzaVias ? ' · cruza las vías' : ''}
                  </dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card aria-labelledby="h-cli">
            <CardTitle id="h-cli">Cliente</CardTitle>
            <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[100px_minmax(0,1fr)]">
              <dt className="font-extrabold text-kr-muted">Nombre</dt>
              <dd className="font-extrabold">{pedido.nombreCliente}</dd>
              <dt className="font-extrabold text-kr-muted">Teléfono</dt>
              <dd className="font-extrabold">
                <a href={`tel:${pedido.telefonoCliente}`} className="text-kr-blue hover:text-kr-navy">{pedido.telefonoCliente}</a>
              </dd>
              <dt className="font-extrabold text-kr-muted">Dirección</dt>
              <dd className="font-extrabold break-words">{pedido.direccion}</dd>
              {pedido.notas && (
                <>
                  <dt className="font-extrabold text-kr-muted">Notas</dt>
                  <dd className="font-bold break-words">{pedido.notas}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card aria-labelledby="h-rep">
            <CardTitle id="h-rep">Repartidor</CardTitle>
            {pedido.repartidor ? (
              <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-kr-line bg-kr-paper px-3 py-2.5">
                <Bicycle size={22} weight="bold" className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-extrabold">{pedido.repartidor.nombre}</p>
                  <a href={`tel:${pedido.repartidor.telefono}`} className="text-sm font-bold text-kr-blue">{pedido.repartidor.telefono}</a>
                  {pedido.pendienteConfirmacion && (
                    <p className="text-[13px] font-extrabold text-kr-orange-dark">Esperando que confirme el pedido en la app…</p>
                  )}
                </div>
              </div>
            ) : esFinal ? (
              <p className="text-sm font-bold text-kr-muted">Sin asignar.</p>
            ) : (
              <>
                <p className="text-sm font-bold text-kr-muted">Tocá un repartidor en el mapa o en la lista para asignarle el pedido.</p>
                <RepartidoresMap
                  fill
                  repartidores={listaRepartidores ?? []}
                  storeLat={storeConfig?.lat ?? null}
                  storeLng={storeConfig?.lng ?? null}
                  destino={destinoPedido}
                  onSelect={(repartidorId) => asignarMutation.mutate(repartidorId)}
                />
                <div className="flex flex-col gap-2">
                  {repartidoresOrdenados.length === 0 && (
                    <p className="text-sm font-bold text-kr-muted">No hay repartidores activos.</p>
                  )}
                  {repartidoresOrdenados.map((r) => {
                    const enLinea = estaEnLinea(r);
                    const dist = enLinea && destinoPedido ? distanciaKm(destinoPedido.lat, destinoPedido.lng, r.lat!, r.lng!) : null;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => asignarMutation.mutate(r.id)}
                        disabled={asignarMutation.isPending}
                        className="flex min-h-12 items-center gap-3 rounded-xl border-[1.5px] border-kr-line bg-white px-3 py-2 text-left transition-colors hover:border-kr-navy hover:bg-kr-yellow-soft disabled:opacity-50"
                      >
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${enLinea ? 'bg-kr-green-dark' : 'bg-kr-line'}`} aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <b className="font-extrabold">{r.nombre}</b>
                          <span className={`text-xs font-extrabold ${enLinea ? 'text-kr-green-dark' : 'text-kr-muted'}`}>
                            {enLinea ? 'En línea' : 'Sin conexión'}{dist !== null ? ` · ${dist.toFixed(1)} km del destino` : ''}
                          </span>
                        </span>
                        <span className="text-[13px] font-extrabold text-kr-blue">Asignar</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {pedido.asignaciones.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-kr-line pt-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Historial de asignación</p>
                {pedido.asignaciones.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 text-[13px]">
                    <span className="font-bold">{a.repartidor?.nombre ?? '—'}</span>
                    <span
                      className={`font-extrabold ${
                        a.respuesta === 'ACEPTADO' ? 'text-kr-green-dark' : a.respuesta === 'RECHAZADO' ? 'text-kr-orange-dark' : 'text-kr-muted'
                      }`}
                    >
                      {ASIGNACION_LABEL[a.respuesta]} · {formatDateTime(a.respondidoAt ?? a.asignadoAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <StickyActionBar>
        {!esFinal && (
          <button type="button" onClick={() => setToCancel(true)} className={buttonClasses('danger', 'md')}>
            Cancelar pedido
          </button>
        )}
        <span className="hidden flex-1 sm:block" />
        <a
            href={waLink(pedido.telefonoCliente, mensajeWa ?? '')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1EA952] px-4 text-sm font-extrabold text-white hover:bg-[#178A43] transition-colors"
          >
            <WhatsappLogo size={18} weight="fill" />
            {mensajeWa ? 'Avisar por WhatsApp' : 'Escribir por WhatsApp'}
          </a>
        {siguiente && (
          <button
            type="button"
            onClick={() => estadoMutation.mutate(siguiente.status)}
            disabled={estadoMutation.isPending}
            className={buttonClasses('primary', 'md', 'flex-1 sm:flex-none')}
          >
            {estadoMutation.isPending ? 'Guardando...' : siguiente.label}
            <CaretRight size={16} weight="bold" />
          </button>
        )}
      </StickyActionBar>

      {editando && (
        <EditarItemModal
          pedidoId={pedido.id}
          item={editando.item}
          modo={editando.modo}
          onClose={() => setEditando(null)}
          onSaved={() => { invalidate(); qc.invalidateQueries({ queryKey: ['products'] }); }}
        />
      )}

      {toCancel && (
        <ConfirmModal
          message="¿Cancelar este pedido? No se puede deshacer."
          confirmLabel="Cancelar pedido"
          loading={cancelarMutation.isPending}
          onConfirm={() => cancelarMutation.mutate()}
          onCancel={() => setToCancel(false)}
        />
      )}
    </>
  );
}
