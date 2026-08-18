'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CaretLeft, CaretRight, WarningCircle } from '@phosphor-icons/react';
import { pedidos, PedidoStatus } from '@/lib/api';
import { money, PEDIDO_STATUS_LABEL } from '@/lib/format';

// mismo criterio que VentasDelDiaModal.tsx (toISODate) - la fecha local, no UTC
const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const TABS: { value: PedidoStatus | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'NUEVO', label: 'Nuevos' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
];

const STATUS_BADGE: Record<PedidoStatus, string> = {
  NUEVO: 'bg-orange-100 text-orange-700',
  EN_PREPARACION: 'bg-amber-100 text-amber-700',
  EN_CAMINO: 'bg-blue-100 text-blue-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
};

export default function PedidosPage() {
  const [tab, setTab] = useState<PedidoStatus | 'TODOS'>('TODOS');
  const [fecha, setFecha] = useState(() => new Date());
  const fechaISO = toISODate(fecha);
  const esHoy = fechaISO === toISODate(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos', tab, fechaISO],
    queryFn: () => pedidos.getAll(tab === 'TODOS' ? undefined : tab, fechaISO),
    refetchInterval: 15000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Pedidos</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.length ?? 0} pedidos</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t.value ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
          <button
            onClick={() => setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white transition-colors"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <p className="text-xs font-bold text-gray-700 capitalize w-36 text-center">
            {fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <button
            onClick={() => setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white transition-colors"
          >
            <CaretRight size={14} weight="bold" />
          </button>
          {!esHoy && (
            <button
              onClick={() => setFecha(new Date())}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 px-2"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">N° pedido</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cliente</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Total</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Repartidor</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data && data.length > 0 ? (
              data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/pedidos/${p.id}`} className="font-semibold text-gray-800 hover:text-orange-500">
                      {p.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.nombreCliente}</td>
                  <td className="px-4 py-3 font-bold text-orange-500">
                    <div className="flex items-center gap-1.5">
                      {money(p.total)}
                      {p.distanciaKm === null && (
                        <span title="Envío estimado - no se pudo geolocalizar la dirección, confirmar con el cliente">
                          <WarningCircle size={15} weight="fill" className="text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.repartidor?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>
                      {PEDIDO_STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(p.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  No hay pedidos en este estado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
