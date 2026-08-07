'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pedidos, PedidoStatus } from '@/lib/api';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

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

const STATUS_LABEL: Record<PedidoStatus, string> = {
  NUEVO: 'Nuevo',
  EN_PREPARACION: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export default function PedidosPage() {
  const [tab, setTab] = useState<PedidoStatus | 'TODOS'>('TODOS');

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos', tab],
    queryFn: () => pedidos.getAll(tab === 'TODOS' ? undefined : tab),
    refetchInterval: 15000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Pedidos</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.length ?? 0} pedidos</p>
      </div>

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
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Fecha</th>
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
                  <td className="px-4 py-3 font-bold text-orange-500">{money(p.total)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.repartidor?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(p.createdAt)}</td>
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
