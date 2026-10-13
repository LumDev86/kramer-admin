'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { repartidores, config, Repartidor } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Card, { CardTitle } from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const RepartidoresMap = dynamic(() => import('@/components/maps/RepartidoresMap'), { ssr: false });

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

// los que todavía no activaste van primero (se registraron desde la app y esperan), después
// los conectados y al final el resto
const orden = (r: Repartidor) => (!r.isActive ? 0 : r.conectado ? 1 : 2);

export default function RepartidoresPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['repartidores'],
    queryFn: () => repartidores.getAll(),
    refetchInterval: 10000,
  });

  const { data: storeConfig } = useQuery({ queryKey: ['store-config'], queryFn: config.get });

  const toggleMutation = useMutation({
    mutationFn: (r: Repartidor) => repartidores.toggleActive(r.id),
    onSuccess: (_d, r) => {
      qc.invalidateQueries({ queryKey: ['repartidores'] });
      toast.show(r.isActive ? `${r.nombre} quedó desactivado` : `${r.nombre} ya puede tomar pedidos`);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo cambiar el estado', 'error'),
  });

  const lista = [...(data ?? [])].sort((a, b) => orden(a) - orden(b) || a.nombre.localeCompare(b.nombre));
  const conectados = lista.filter((r) => r.conectado).length;
  const activos = lista.filter((r) => r.isActive).length;
  const sinActivar = lista.length - activos;

  return (
    <>
      <PageHeader title="Repartidores" subtitle="Se registran desde la app Kramer Delivery. Acá los activás y ves dónde están." />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Conectados ahora" value={conectados} tono="text-kr-green-dark" />
        <Stat label="Activos" value={activos} />
        <Stat label="Sin activar" value={sinActivar} tono={sinActivar > 0 ? 'text-kr-orange-dark' : ''} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card flush aria-label="Lista de repartidores">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-kr-sand" />)}
            </div>
          ) : lista.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">Todavía no se registró ningún repartidor.</p>
          ) : (
            <ul>
              {lista.map((r) => {
                const ocupado = toggleMutation.isPending && toggleMutation.variables?.id === r.id;
                return (
                  <li key={r.id} className="flex items-center gap-3 border-b border-dashed border-kr-line px-4 py-3 last:border-b-0">
                    <span
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 font-display text-base ${
                        r.conectado ? 'border-kr-green-dark bg-kr-green-soft text-kr-green-dark' : 'border-kr-line bg-kr-sand text-kr-muted'
                      }`}
                      aria-hidden="true"
                    >
                      {iniciales(r.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-extrabold leading-snug ${r.isActive ? '' : 'text-kr-muted'}`}>{r.nombre}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-kr-muted">
                        <a href={`tel:${r.telefono}`} className="hover:text-kr-blue">{r.telefono}</a>
                        {!r.isActive ? (
                          <Chip tone="warn">Espera activación</Chip>
                        ) : r.conectado ? (
                          <Chip tone="ok">En línea</Chip>
                        ) : (
                          <Chip tone="off">Desconectado</Chip>
                        )}
                      </p>
                      {!r.isActive && <p className="text-xs font-bold text-kr-muted">Se registró el {formatDateTime(r.createdAt)}</p>}
                    </div>
                    {!r.isActive ? (
                      <button type="button" onClick={() => toggleMutation.mutate(r)} disabled={ocupado} className={buttonClasses('primary', 'sm')}>
                        {ocupado ? 'Activando…' : 'Activar'}
                      </button>
                    ) : (
                      <ToggleSwitch label={`${r.nombre} activo`} checked={r.isActive} loading={ocupado} onChange={() => toggleMutation.mutate(r)} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card aria-labelledby="h-map">
          <CardTitle id="h-map">Dónde están</CardTitle>
          <div className="overflow-hidden rounded-xl border border-kr-line">
            <RepartidoresMap fill repartidores={data ?? []} storeLat={storeConfig?.lat ?? null} storeLng={storeConfig?.lng ?? null} />
          </div>
          <p className="text-[13px] font-bold text-kr-muted">Solo aparecen los conectados. La ubicación se actualiza sola cada pocos segundos.</p>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, tono = '' }: { label: string; value: number; tono?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-kr-line bg-white px-3 py-3 sm:px-4">
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-kr-muted sm:text-xs">{label}</span>
      <span className={`font-display text-3xl leading-tight tabular-nums ${tono}`}>{value}</span>
    </div>
  );
}
