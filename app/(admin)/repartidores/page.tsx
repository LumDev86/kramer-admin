'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { repartidores, config } from '@/lib/api';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function RepartidoresPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['repartidores'],
    queryFn: () => repartidores.getAll(),
    refetchInterval: 10000,
  });

  const { data: storeConfig } = useQuery({ queryKey: ['store-config'], queryFn: config.get });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => repartidores.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repartidores'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Repartidores</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">
          {data?.length ?? 0} repartidores · se registran solos desde la app Kramer Delivery
        </p>
      </div>

      <RepartidoresMap
        repartidores={data ?? []}
        storeLat={storeConfig?.lat ?? null}
        storeLng={storeConfig?.lng ?? null}
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Teléfono</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Registrado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Conectado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data && data.length > 0 ? (
              data.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${!r.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{r.telefono}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {r.conectado ? (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">En línea</span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Desconectado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={r.isActive}
                      loading={toggleMutation.isPending && toggleMutation.variables === r.id}
                      onChange={() => toggleMutation.mutate(r.id)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  Todavía no se registró ningún repartidor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
