'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { repartidores, config } from '@/lib/api';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const PANEL_SIZE = 440;

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

  const conectadosCount = data?.filter((r) => r.conectado).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Repartidores</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">
          {data?.length ?? 0} repartidores · se registran solos desde la app Kramer Delivery
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px] bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Conectados ahora</p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{conectadosCount}</p>
        </div>
        <div className="flex-1 min-w-[140px] bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total registrados</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">{data?.length ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <RepartidoresMap
          repartidores={data ?? []}
          storeLat={storeConfig?.lat ?? null}
          storeLng={storeConfig?.lng ?? null}
          size={PANEL_SIZE}
        />

        <div
          style={{ height: PANEL_SIZE }}
          className="flex-1 w-full bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Repartidores</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5">
                  <div className="h-5 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : data && data.length > 0 ? (
              data.map((r) => (
                <div
                  key={r.id}
                  className={`px-4 py-3.5 flex items-center gap-3 transition-colors ${!r.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm truncate">{r.nombre}</p>
                    <p className="text-xs text-gray-400">{r.telefono} · desde {formatDateTime(r.createdAt)}</p>
                  </div>
                  {r.conectado ? (
                    <span className="flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      En línea
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      Desconectado
                    </span>
                  )}
                  <ToggleSwitch
                    checked={r.isActive}
                    loading={toggleMutation.isPending && toggleMutation.variables === r.id}
                    onChange={() => toggleMutation.mutate(r.id)}
                  />
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                Todavía no se registró ningún repartidor.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
