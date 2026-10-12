'use client';

import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { pedidos, Pedido, PedidoStatus } from '@/lib/api';
import { money, PEDIDO_STATUS_LABEL, PAYMENT_LABEL } from '@/lib/format';
import Segmented from '@/components/ui/Segmented';
import Chip from '@/components/ui/Chip';
import PedidoCard from '@/components/pedidos/PedidoCard';
import { hora, STATUS_TONE, useAhora } from '@/components/pedidos/pedidoUtils';

// mismo criterio que VentasDelDiaModal.tsx (toISODate) - la fecha local, no UTC
const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const COLUMNAS: { status: PedidoStatus; title: string; short: string; color: string; vacio: string }[] = [
  { status: 'NUEVO', title: 'Nuevos', short: 'Nuevos', color: 'bg-kr-yellow', vacio: 'No hay pedidos nuevos.' },
  { status: 'EN_PREPARACION', title: 'En preparación', short: 'Preparando', color: 'bg-kr-blue-light', vacio: 'No hay pedidos en preparación.' },
  { status: 'EN_CAMINO', title: 'En camino', short: 'En camino', color: 'bg-kr-green', vacio: 'No hay pedidos en camino.' },
];

type Vista = 'curso' | 'historial';
type FiltroHist = 'TODOS' | 'ENTREGADO' | 'CANCELADO';

export default function PedidosPage() {
  const [vista, setVista] = useState<Vista>('curso');
  // celular: no entran las tres columnas, se elige cuál ver
  const [columnaCel, setColumnaCel] = useState<PedidoStatus>('NUEVO');
  const [filtroHist, setFiltroHist] = useState<FiltroHist>('TODOS');
  const [fecha, setFecha] = useState(() => new Date());
  const fechaISO = toISODate(fecha);
  const esHoy = fechaISO === toISODate(new Date());
  const now = useAhora();

  // "En curso" no depende de la fecha: un pedido de anoche que sigue en camino tiene que verse
  const enCurso = useQueries({
    queries: COLUMNAS.map((c) => ({
      queryKey: ['pedidos', 'en-curso', c.status],
      queryFn: () => pedidos.getAll(c.status),
      refetchInterval: 15000,
    })),
  });
  // el más viejo arriba: es el que más está esperando
  const porColumna = (i: number): Pedido[] =>
    [...(enCurso[i].data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const totalEnCurso = enCurso.reduce((s, q) => s + (q.data?.length ?? 0), 0);

  const { data: delDia, isLoading: histLoading } = useQuery({
    queryKey: ['pedidos', 'historial', fechaISO],
    queryFn: () => pedidos.getAll(undefined, fechaISO),
    refetchInterval: 15000,
    enabled: vista === 'historial',
  });
  const historial = (delDia ?? []).filter((p) => filtroHist === 'TODOS' || p.status === filtroHist);

  const moverFecha = (dias: number) =>
    setFecha((d) => { const n = new Date(d); n.setDate(n.getDate() + dias); return n; });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="hidden md:block font-display text-[34px] leading-none mr-auto">Pedidos</h1>
        <Segmented<Vista>
          ariaLabel="Vista"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'curso', label: 'En curso', count: totalEnCurso },
            { value: 'historial', label: 'Historial' },
          ]}
        />
        {vista === 'historial' && (
          <div className="flex items-center gap-1 rounded-xl border-[1.5px] border-kr-line bg-white p-1">
            <button type="button" onClick={() => moverFecha(-1)} aria-label="Día anterior" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-kr-sand">
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="flex min-w-[120px] items-center justify-center gap-1.5 text-sm font-extrabold capitalize">
              <CalendarBlank size={16} weight="bold" />
              {esHoy ? 'Hoy' : fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button type="button" onClick={() => moverFecha(1)} aria-label="Día siguiente" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-kr-sand">
              <CaretRight size={16} weight="bold" />
            </button>
            {!esHoy && (
              <button type="button" onClick={() => setFecha(new Date())} className="min-h-9 rounded-lg px-2.5 text-[13px] font-extrabold text-kr-blue hover:bg-kr-blue-soft">
                Hoy
              </button>
            )}
          </div>
        )}
      </div>

      {vista === 'curso' && (
        <>
          <Segmented<PedidoStatus>
            ariaLabel="Estado"
            full
            className="md:hidden"
            value={columnaCel}
            onChange={setColumnaCel}
            options={COLUMNAS.map((c, i) => ({ value: c.status, label: c.short, count: enCurso[i].data?.length ?? 0 }))}
          />
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3 lg:gap-4">
            {COLUMNAS.map((c, i) => {
              const lista = porColumna(i);
              return (
                <section
                  key={c.status}
                  aria-label={c.title}
                  className={`min-w-0 flex-col gap-2.5 md:flex md:rounded-[18px] md:bg-kr-sand md:p-2.5 ${columnaCel === c.status ? 'flex' : 'hidden'}`}
                >
                  <h2 className="hidden items-center gap-2 px-1.5 pt-1 text-[15px] font-extrabold md:flex">
                    <span className={`h-3 w-3 rounded border-[1.5px] border-kr-navy ${c.color}`} aria-hidden="true" />
                    {c.title}
                    <span className="ml-auto rounded-lg border border-kr-line bg-white px-2 text-[13px]">{lista.length}</span>
                  </h2>
                  {enCurso[i].isLoading ? (
                    <div className="h-40 animate-pulse rounded-2xl bg-white/70" />
                  ) : lista.length === 0 ? (
                    <p className="rounded-2xl border-[1.5px] border-dashed border-kr-line px-3 py-6 text-center text-sm font-bold text-kr-muted">
                      {c.vacio}
                    </p>
                  ) : (
                    lista.map((p) => <PedidoCard key={p.id} pedido={p} now={now} />)
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {vista === 'historial' && (
        <>
          <Segmented<FiltroHist>
            ariaLabel="Filtrar por estado"
            className="self-start"
            value={filtroHist}
            onChange={setFiltroHist}
            options={[
              { value: 'TODOS', label: 'Todos', count: delDia?.length },
              { value: 'ENTREGADO', label: 'Entregados', count: delDia?.filter((p) => p.status === 'ENTREGADO').length },
              { value: 'CANCELADO', label: 'Cancelados', count: delDia?.filter((p) => p.status === 'CANCELADO').length },
            ]}
          />
          <section className="overflow-hidden rounded-2xl border border-kr-line bg-white">
            {histLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-kr-sand" />)}
              </div>
            ) : historial.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">No hay pedidos para mostrar ese día.</p>
            ) : (
              <>
                {/* tablet y escritorio: tabla */}
                <table className="hidden w-full text-sm md:table">
                  <thead>
                    <tr className="border-b border-kr-line bg-kr-paper text-left text-xs font-extrabold uppercase tracking-wide text-kr-muted">
                      <th className="px-3 py-2.5">N°</th>
                      <th className="px-3 py-2.5">Hora</th>
                      <th className="px-3 py-2.5">Cliente</th>
                      <th className="hidden px-3 py-2.5 lg:table-cell">Dirección</th>
                      <th className="px-3 py-2.5">Pago</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((p) => (
                      <tr key={p.id} className="border-b border-dashed border-kr-line last:border-b-0 hover:bg-kr-paper">
                        <td className="px-3 py-3 align-top">
                          <Link href={`/pedidos/${p.id}`} className="font-extrabold text-kr-blue hover:text-kr-navy">{p.numero}</Link>
                        </td>
                        <td className="px-3 py-3 align-top font-bold tabular-nums">{hora(p.createdAt)}</td>
                        <td className="px-3 py-3 align-top font-bold">
                          {p.nombreCliente}
                          {p.repartidor && <span className="block text-xs text-kr-muted">Repartió: {p.repartidor.nombre}</span>}
                        </td>
                        <td className="hidden px-3 py-3 align-top font-bold text-kr-muted lg:table-cell">{p.direccion}</td>
                        <td className="px-3 py-3 align-top font-bold">{PAYMENT_LABEL[p.paymentMethod]}</td>
                        <td className="px-3 py-3 align-top text-right font-extrabold tabular-nums whitespace-nowrap">{money(p.total)}</td>
                        <td className="px-3 py-3 align-top"><Chip tone={STATUS_TONE[p.status]}>{PEDIDO_STATUS_LABEL[p.status]}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* celular: tarjetas */}
                <ul className="flex flex-col divide-y divide-dashed divide-kr-line md:hidden">
                  {historial.map((p) => (
                    <li key={p.id}>
                      <Link href={`/pedidos/${p.id}`} className="flex flex-col gap-1 px-3.5 py-3 active:bg-kr-paper">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg leading-none">{p.numero}</span>
                          <span className="text-[13px] font-extrabold text-kr-muted">{hora(p.createdAt)}</span>
                          <span className="ml-auto"><Chip tone={STATUS_TONE[p.status]}>{PEDIDO_STATUS_LABEL[p.status]}</Chip></span>
                        </span>
                        <span className="font-extrabold">{p.nombreCliente}</span>
                        <span className="text-[13px] font-bold text-kr-muted">{p.direccion}</span>
                        <span className="flex items-center gap-2 text-sm">
                          <span className="rounded-lg border border-kr-line bg-kr-paper px-2 py-0.5 text-xs font-extrabold">{PAYMENT_LABEL[p.paymentMethod]}</span>
                          <span className="ml-auto font-extrabold tabular-nums">{money(p.total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
