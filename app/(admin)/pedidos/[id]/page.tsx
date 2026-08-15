'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { pedidos, repartidores as repartidoresApi, config, PedidoStatus } from '@/lib/api';
import { CaretLeft, WhatsappLogo } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

// Leaflet necesita `window` - no puede renderizarse en el servidor
const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const CLIENT_URL = 'https://kramer-client.vercel.app';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// wa.me necesita el número con código de país sin signos; si ya viene con 54 lo dejamos,
// si no, asumimos Argentina (mercado de esta tienda) - mismo criterio que ClienteDetallePage
const toWhatsappNumber = (telefono: string): string => {
  const digits = telefono.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `549${digits}`;
};

const waLink = (telefono: string, mensaje: string) =>
  `https://wa.me/${toWhatsappNumber(telefono)}?text=${encodeURIComponent(mensaje)}`;

const STATUS_LABEL: Record<PedidoStatus, string> = {
  NUEVO: 'Nuevo',
  EN_PREPARACION: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const PAYMENT_LABEL: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia' };

export default function PedidoDetallePage() {
  const { id } = useParams() as { id: string };
  const qc = useQueryClient();
  const [toCancel, setToCancel] = useState(false);

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

  const estadoMutation = useMutation({
    mutationFn: (status: PedidoStatus) => pedidos.actualizarEstado(id, status),
    onSuccess: invalidate,
  });

  const asignarMutation = useMutation({
    mutationFn: (repartidorId: string) => pedidos.asignar(id, repartidorId),
    onSuccess: invalidate,
  });

  const cancelarMutation = useMutation({
    mutationFn: () => pedidos.cancelar(id),
    onSuccess: () => {
      invalidate();
      setToCancel(false);
    },
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }
  if (!pedido) return <p className="text-sm text-gray-400 font-medium">Pedido no encontrado.</p>;

  const trackingUrl = `${CLIENT_URL}/pedido/${pedido.trackingToken}`;
  const mensajesPorEstado: Partial<Record<PedidoStatus, string>> = {
    EN_PREPARACION: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} está en preparación 👨‍🍳`,
    EN_CAMINO: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} está en camino 🛵. Cuando lo recibas, respondé este mensaje con "recibido". Podés seguirlo acá: ${trackingUrl}`,
    ENTREGADO: `Hola ${pedido.nombreCliente}! Tu pedido ${pedido.numero} fue entregado. ¡Gracias por tu compra! 🎉`,
    CANCELADO: `Hola ${pedido.nombreCliente}, tu pedido ${pedido.numero} fue cancelado. Cualquier consulta, escribinos por acá.`,
  };

  const activos = listaRepartidores?.filter((r) => r.isActive) ?? [];
  const noConectados = activos.filter((r) => !r.conectado);
  const esFinal = pedido.status === 'ENTREGADO' || pedido.status === 'CANCELADO';

  const siguienteAccion: { label: string; status: PedidoStatus }[] =
    pedido.status === 'NUEVO'
      ? [{ label: 'Marcar en preparación', status: 'EN_PREPARACION' }]
      : pedido.status === 'EN_PREPARACION'
        ? [{ label: 'Marcar en camino', status: 'EN_CAMINO' }]
        : pedido.status === 'EN_CAMINO'
          ? [{ label: 'Marcar entregado', status: 'ENTREGADO' }]
          : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/pedidos" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-800">{pedido.numero}</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{formatDateTime(pedido.createdAt)}</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-50 text-orange-600">
          {STATUS_LABEL[pedido.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
          <p className="font-semibold text-gray-800">{pedido.nombreCliente}</p>
          <p className="text-sm text-gray-500">{pedido.telefonoCliente}</p>
          <p className="text-sm text-gray-500 mt-1">{pedido.direccion}</p>
          {pedido.notas && <p className="text-xs text-gray-400 mt-1">📝 {pedido.notas}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Pago y total</p>
          <p className="font-semibold text-gray-800">{PAYMENT_LABEL[pedido.paymentMethod]}</p>
          <p className="text-2xl font-extrabold text-orange-500 mt-1">{money(pedido.total)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-700">Productos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {pedido.items.map((item) => (
            <div key={item.id} className="flex justify-between px-5 py-2.5 text-sm">
              <span className="text-gray-600">{item.quantity} × {item.name}</span>
              <span className="font-semibold text-gray-700">{money(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700">Repartidor</p>
        {pedido.repartidor ? (
          <p className="text-sm text-gray-600">{pedido.repartidor.nombre} · {pedido.repartidor.telefono}</p>
        ) : esFinal ? (
          <p className="text-sm text-gray-400">Sin asignar.</p>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              Asigná el pedido tocando al repartidor más cercano en el mapa.
            </p>
            <RepartidoresMap
              repartidores={listaRepartidores ?? []}
              storeLat={storeConfig?.lat ?? null}
              storeLng={storeConfig?.lng ?? null}
              onSelect={(repartidorId) => asignarMutation.mutate(repartidorId)}
            />
            {noConectados.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Activos sin conectar (igual se pueden asignar)
                </p>
                {noConectados.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => asignarMutation.mutate(r.id)}
                    disabled={asignarMutation.isPending}
                    className="text-left text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {r.nombre} · {r.telefono}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!esFinal && (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700">Avanzar pedido</p>
          <div className="flex flex-wrap gap-2">
            {siguienteAccion.map((accion) => (
              <button
                key={accion.status}
                onClick={() => estadoMutation.mutate(accion.status)}
                disabled={estadoMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {accion.label}
              </button>
            ))}
            <a
              href={waLink(pedido.telefonoCliente, mensajesPorEstado[pedido.status] ?? '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white text-sm font-bold transition-opacity"
            >
              <WhatsappLogo size={16} weight="fill" />
              Avisar por WhatsApp ({STATUS_LABEL[pedido.status]})
            </a>
            <button
              onClick={() => setToCancel(true)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
            >
              Cancelar pedido
            </button>
          </div>
        </div>
      )}

      {esFinal && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <a
            href={waLink(pedido.telefonoCliente, mensajesPorEstado[pedido.status] ?? '')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 w-fit px-4 py-2.5 rounded-xl bg-[#25D366] hover:opacity-90 text-white text-sm font-bold transition-opacity"
          >
            <WhatsappLogo size={16} weight="fill" />
            Avisar por WhatsApp ({STATUS_LABEL[pedido.status]})
          </a>
        </div>
      )}

      {toCancel && (
        <ConfirmModal
          message="¿Cancelar este pedido? No se puede deshacer."
          loading={cancelarMutation.isPending}
          onConfirm={() => cancelarMutation.mutate()}
          onCancel={() => setToCancel(false)}
        />
      )}
    </div>
  );
}
