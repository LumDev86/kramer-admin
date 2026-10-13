'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { reportes, cashSessions, TipoPeriodo } from '@/lib/api';
import { CaretDown, CaretLeft, CaretRight, Printer, TrendDown, TrendUp } from '@phosphor-icons/react';
import { money, formatDateTime } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Segmented from '@/components/ui/Segmented';
import Card, { CardTitle } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const diffColor = (diff: string | null) => {
  if (diff === null) return 'text-kr-muted';
  const n = Number(diff);
  if (n === 0) return 'text-kr-green-dark';
  return n < 0 ? 'text-kr-orange-dark' : 'text-kr-blue';
};

const diffLabel = (diff: string | null) => {
  if (diff === null) return '—';
  const n = Number(diff);
  const sign = n > 0 ? '+' : '';
  return `${sign}${money(diff)}${n < 0 ? ' (faltante)' : n > 0 ? ' (sobrante)' : ''}`;
};

const PERIODOS: { value: TipoPeriodo; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

type Seccion = 'resumen' | 'productos' | 'caja' | 'compras';

const formatPeriodoLabel = (periodo: { tipo: TipoPeriodo; desde: string; hasta: string }): string => {
  const desde = new Date(`${periodo.desde}T00:00:00`);
  const hasta = new Date(`${periodo.hasta}T00:00:00`);
  if (periodo.tipo === 'dia') {
    const label = desde.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (periodo.tipo === 'semana') {
    return `Semana del ${desde.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} al ${hasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  if (periodo.tipo === 'mes') {
    const label = desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return `Año ${desde.getFullYear()}`;
};

const TIPO_ABREV: Record<TipoPeriodo, string> = { dia: 'D', semana: 'S', mes: 'M', anio: 'A' };

const numeroDocumento = (periodo: { tipo: TipoPeriodo; desde: string }): string =>
  `RPT-${TIPO_ABREV[periodo.tipo]}-${periodo.desde.replace(/-/g, '')}`;

const VariacionBadge = ({ pct }: { pct: number | null }) => {
  if (pct === null) {
    return <span className="text-xs font-bold text-kr-muted">Sin período anterior para comparar</span>;
  }
  const up = pct >= 0;
  const Icon = up ? TrendUp : TrendDown;
  return (
    <span className={`flex items-center gap-1 text-xs font-extrabold ${up ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
      <Icon size={14} weight="bold" />
      {Math.abs(pct).toFixed(1)}% vs. período anterior
    </span>
  );
};

function Kpi({ label, value, children, destacado, valueClass = '' }: { label: string; value: string; children?: ReactNode; destacado?: boolean; valueClass?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1 rounded-2xl px-4 py-3.5 print:break-inside-avoid print:rounded-none print:border print:border-gray-300 print:bg-white print:text-black print:shadow-none ${
        destacado ? 'border-2 border-kr-navy bg-kr-navy text-white shadow-pop-lg' : 'border border-kr-line bg-white'
      }`}
    >
      <span className={`text-xs font-extrabold uppercase tracking-wide ${destacado ? 'text-kr-side-text' : 'text-kr-muted'}`}>{label}</span>
      <span className={`font-display text-[26px] leading-tight tabular-nums [overflow-wrap:anywhere] ${valueClass}`}>{value}</span>
      {children}
    </div>
  );
}

// fila con barra proporcional: sirve para comparar de un vistazo (canales, medios de pago, categorías)
function BarRow({ label, value, max, color, sub }: { label: ReactNode; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 sm:grid-cols-[minmax(110px,180px)_minmax(0,1fr)_auto]">
      <span className="min-w-0 text-sm font-bold">
        {label}
        {sub && <span className="font-bold text-kr-muted"> · {sub}</span>}
      </span>
      <span className="order-3 col-span-2 block h-2.5 overflow-hidden rounded-full bg-kr-sand sm:order-none sm:col-span-1 print:border print:border-gray-300">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${value > 0 ? pct : 0}%` }} />
      </span>
      <span className="text-right text-sm font-extrabold tabular-nums">{money(value)}</span>
    </div>
  );
}

function Ranking({ items, vacio }: { items: { key: string; nombre: ReactNode; detalle?: ReactNode; valor: ReactNode }[]; vacio: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm font-bold text-kr-muted">{vacio}</p>;
  return (
    <ol className="flex flex-col">
      {items.map((it, i) => (
        <li key={it.key} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-2 border-b border-dashed border-kr-line py-2 last:border-b-0">
          <span className="pt-0.5 text-sm font-extrabold tabular-nums text-kr-muted">{i + 1}</span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold leading-snug">{it.nombre}</span>
            {it.detalle && <span className="block text-xs font-bold text-kr-muted">{it.detalle}</span>}
          </span>
          <span className="text-right text-sm font-extrabold tabular-nums">{it.valor}</span>
        </li>
      ))}
    </ol>
  );
}

// en pantalla se ve solo la sección elegida; al imprimir salen todas, como el reporte de siempre
// (clases escritas enteras: Tailwind no ve las que se arman con variables)
const visible = (activa: boolean, display: 'flex' | 'grid' = 'flex') =>
  display === 'grid' ? (activa ? 'grid' : 'hidden print:grid') : activa ? 'flex' : 'hidden print:flex';

export default function ReportesPage() {
  const [tipo, setTipo] = useState<TipoPeriodo>('dia');
  const [fecha, setFecha] = useState(() => new Date());
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cambiarTipo = (nuevo: TipoPeriodo) => {
    setTipo(nuevo);
    setFecha(new Date());
    setExpandedId(null);
  };

  const shift = (delta: number) => {
    setExpandedId(null);
    setFecha((prev) => {
      if (tipo === 'dia') { const d = new Date(prev); d.setDate(d.getDate() + delta); return d; }
      if (tipo === 'semana') { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d; }
      if (tipo === 'mes') return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      return new Date(prev.getFullYear() + delta, 0, 1);
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reportes', tipo, toISODate(fecha)],
    queryFn: () => reportes.getReporte(tipo, toISODate(fecha)),
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['cash-session', 'breakdown', expandedId],
    queryFn: () => cashSessions.getBreakdown(expandedId!),
    enabled: !!expandedId,
  });

  const esActual = (() => {
    const hoy = new Date();
    if (tipo === 'dia') return toISODate(fecha) === toISODate(hoy);
    if (tipo === 'mes') return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    if (tipo === 'anio') return fecha.getFullYear() === hoy.getFullYear();
    return data ? toISODate(hoy) >= data.periodo.desde && toISODate(hoy) <= data.periodo.hasta : true;
  })();

  return (
    <div className="flex flex-col gap-4" id="reporte-imprimible">
      {/* encabezado del documento impreso */}
      <div className="mb-4 hidden items-start justify-between gap-4 border-b-4 border-double border-gray-800 pb-4 print:flex">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            <Image src="/logo.png" alt="Kiosco Kramer" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">KIOSCO KRAMER</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Panel de administración</p>
          </div>
        </div>
        <div className="min-w-[220px] rounded border border-gray-800 px-4 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Reporte de gestión</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-gray-800">{data ? numeroDocumento(data.periodo) : ''}</p>
          <p className="mt-1 text-xs font-bold text-gray-700">{data ? formatPeriodoLabel(data.periodo) : ''}</p>
          <p className="mt-1 text-[10px] text-gray-400">Emitido {new Date().toLocaleString('es-AR')}</p>
        </div>
      </div>

      <PageHeader
        title="Reportes"
        actions={
          <button type="button" onClick={() => window.print()} className={buttonClasses('secondary', 'md')}>
            <Printer size={18} weight="bold" />
            Imprimir reporte completo
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <Segmented<TipoPeriodo> ariaLabel="Período" value={tipo} onChange={cambiarTipo} options={PERIODOS} />
        <div className="flex items-center gap-1 rounded-xl border-[1.5px] border-kr-line bg-white p-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Período anterior" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-kr-sand">
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="min-w-[150px] px-1 text-center text-sm font-extrabold sm:min-w-[220px]">{data ? formatPeriodoLabel(data.periodo) : '…'}</span>
          <button type="button" onClick={() => shift(1)} aria-label="Período siguiente" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-kr-sand">
            <CaretRight size={16} weight="bold" />
          </button>
          {!esActual && (
            <button type="button" onClick={() => setFecha(new Date())} className="min-h-9 rounded-lg px-2.5 text-[13px] font-extrabold text-kr-blue hover:bg-kr-blue-soft">
              Hoy
            </button>
          )}
        </div>
      </div>

      <Segmented<Seccion>
        ariaLabel="Secciones del reporte"
        full
        className="print:hidden sm:w-auto sm:self-start"
        value={seccion}
        onChange={setSeccion}
        options={[
          { value: 'resumen', label: 'Resumen' },
          { value: 'productos', label: 'Productos' },
          { value: 'caja', label: 'Caja' },
          { value: 'compras', label: 'Compras' },
        ]}
      />

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}
        </div>
      ) : (
        <>
          {/* RESUMEN */}
          <section aria-label="Resumen" className={`${visible(seccion === 'resumen')} flex-col gap-4`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Ventas totales" value={money(data.ventas.total)}>
                <VariacionBadge pct={data.ventas.variacionPct} />
              </Kpi>
              <Kpi label="Ganancia bruta" value={money(data.ganancia.total)} valueClass="text-kr-green-dark print:text-black">
                <span className="text-xs font-bold text-kr-muted">Margen {data.ganancia.margenPct.toFixed(1)}%</span>
                <VariacionBadge pct={data.ganancia.variacionPct} />
              </Kpi>
              <Kpi label="Ticket promedio" value={money(data.ventas.ticketPromedio)}>
                <span className="text-xs font-bold text-kr-muted">{data.ventas.count} ventas</span>
              </Kpi>
              <Kpi destacado label="Resultado neto" value={money(data.ganancia.total - data.perdidas.faltantesCaja)}>
                <span className="text-xs font-bold text-kr-side-text print:text-gray-500">Ganancia menos faltantes de caja</span>
              </Kpi>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="print:break-inside-avoid">
                <CardTitle>Por canal</CardTitle>
                <div>
                  <BarRow
                    label="En el local"
                    sub={`${data.ventas.byChannel.POS.count} ventas`}
                    value={data.ventas.byChannel.POS.total}
                    max={Math.max(data.ventas.byChannel.POS.total, data.ventas.byChannel.DELIVERY.total)}
                    color="bg-kr-blue"
                  />
                  <BarRow
                    label="Pedidos web"
                    sub={`${data.ventas.byChannel.DELIVERY.count} pedidos`}
                    value={data.ventas.byChannel.DELIVERY.total}
                    max={Math.max(data.ventas.byChannel.POS.total, data.ventas.byChannel.DELIVERY.total)}
                    color="bg-kr-orange"
                  />
                </div>
              </Card>
              <Card className="print:break-inside-avoid">
                <CardTitle>Por medio de pago</CardTitle>
                <div>
                  {(() => {
                    const m = data.ventas.byMethod;
                    const max = Math.max(m.CASH, m.TRANSFER, m.CREDIT);
                    return (
                      <>
                        <BarRow label="Efectivo" value={m.CASH} max={max} color="bg-kr-green-dark" />
                        <BarRow label="Transferencia" value={m.TRANSFER} max={max} color="bg-kr-blue" />
                        <BarRow label="Crédito" value={m.CREDIT} max={max} color="bg-kr-yellow" />
                      </>
                    );
                  })()}
                </div>
              </Card>
              <Card className="print:break-inside-avoid">
                <CardTitle>Crédito a clientes</CardTitle>
                <div>
                  <BarRow label="Otorgado" value={data.fiado.otorgado} max={Math.max(data.fiado.otorgado, data.fiado.cobrado)} color="bg-kr-yellow" />
                  <BarRow label="Cobrado" value={data.fiado.cobrado} max={Math.max(data.fiado.otorgado, data.fiado.cobrado)} color="bg-kr-green-dark" />
                </div>
              </Card>
              <Card className="print:break-inside-avoid">
                <CardTitle>Faltantes de caja</CardTitle>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={`font-display text-3xl tabular-nums ${data.perdidas.faltantesCaja > 0 ? 'text-kr-orange-dark' : ''}`}>
                    {money(data.perdidas.faltantesCaja)}
                  </span>
                  <span className="text-sm font-extrabold text-kr-muted">
                    en {data.perdidas.turnosConFaltante} {data.perdidas.turnosConFaltante === 1 ? 'turno' : 'turnos'} de caja
                  </span>
                </p>
                {data.perdidas.turnosConFaltante > 0 && (
                  <button type="button" onClick={() => setSeccion('caja')} className="self-start text-[13px] font-extrabold text-kr-blue hover:underline print:hidden">
                    Ver los cortes de caja
                  </button>
                )}
              </Card>
            </div>
          </section>

          {/* PRODUCTOS */}
          <section aria-label="Productos" className={`${visible(seccion === 'productos', 'grid')} gap-4 lg:grid-cols-2`}>
            <Card className="print:break-inside-avoid">
              <CardTitle>Más vendidos</CardTitle>
              <Ranking
                vacio="Sin ventas en este período."
                items={data.productosMasVendidos.map((p) => ({
                  key: p.productId ?? p.name,
                  nombre: p.name,
                  detalle: `${p.quantity} u. vendidas`,
                  valor: money(p.total),
                }))}
              />
            </Card>
            <Card className="print:break-inside-avoid">
              <CardTitle>Más rentables</CardTitle>
              <Ranking
                vacio="Sin ventas en este período."
                items={data.productosMasRentables.map((p) => ({
                  key: p.productId ?? p.name,
                  nombre: p.name,
                  valor: <span className="text-kr-green-dark print:text-black">{money(p.profit)}</span>,
                }))}
              />
            </Card>
            <Card className="print:break-inside-avoid">
              <CardTitle>Por categoría</CardTitle>
              {data.ventasPorCategoria.length === 0 ? (
                <p className="py-6 text-center text-sm font-bold text-kr-muted">Sin ventas en este período.</p>
              ) : (
                <div>
                  {(() => {
                    const max = Math.max(...data.ventasPorCategoria.map((c) => c.total));
                    return data.ventasPorCategoria.map((c) => <BarRow key={c.name} label={c.name} value={c.total} max={max} color="bg-kr-blue" />);
                  })()}
                </div>
              )}
            </Card>
            <Card className="print:break-inside-avoid">
              <CardTitle>Con aumento de precio</CardTitle>
              <Ranking
                vacio="No hubo aumentos de precio en este período."
                items={data.productosConAumento.map((p) => ({
                  key: p.productId,
                  nombre: p.title,
                  detalle: `${money(p.precioAnterior)} → ${money(p.precioNuevo)}`,
                  valor: <span className="rounded-full bg-[#FFE7D6] px-2 py-0.5 text-kr-orange-dark">+{p.pct.toFixed(1)}%</span>,
                }))}
              />
            </Card>
          </section>

          {/* CAJA */}
          <section aria-label="Cortes de caja" className={`${visible(seccion === 'caja')} flex-col gap-3`}>
            <h2 className="hidden font-display text-xl print:block">Cortes de caja</h2>
            <div className="overflow-hidden rounded-2xl border border-kr-line bg-white print:break-inside-avoid print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-kr-line bg-kr-paper text-left text-xs font-extrabold uppercase tracking-wide text-kr-muted">
                      <th className="w-10 px-3 py-2.5 print:hidden" />
                      <th className="px-3 py-2.5">Turno</th>
                      <th className="px-3 py-2.5 text-right">Inicial</th>
                      <th className="px-3 py-2.5 text-right">Esperado</th>
                      <th className="px-3 py-2.5 text-right">Contado</th>
                      <th className="px-3 py-2.5 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cortesDeCaja.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm font-bold text-kr-muted">No hay cortes de caja en este período.</td>
                      </tr>
                    ) : (
                      data.cortesDeCaja.map((s) => {
                        const abierta = expandedId === s.id;
                        return (
                          <Fragment key={s.id}>
                            <tr
                              onClick={() => setExpandedId(abierta ? null : s.id)}
                              className="cursor-pointer border-b border-dashed border-kr-line last:border-b-0 hover:bg-kr-paper print:cursor-auto"
                            >
                              <td className="px-3 py-3 print:hidden">
                                <button type="button" aria-expanded={abierta} aria-label="Ver detalle del turno" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-kr-sand">
                                  <CaretDown size={14} weight="bold" className={`transition-transform ${abierta ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                              <td className="px-3 py-3">
                                <span className="block font-extrabold">{formatDateTime(s.openedAt)}</span>
                                <span className="block text-xs font-bold text-kr-muted">cerró {s.closedAt ? formatDateTime(s.closedAt) : '—'}</span>
                              </td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums">{money(s.openingAmount)}</td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums">{s.expectedAmount ? money(s.expectedAmount) : '—'}</td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums">{s.closingAmount ? money(s.closingAmount) : '—'}</td>
                              <td className={`px-3 py-3 text-right font-extrabold tabular-nums ${diffColor(s.difference)}`}>{diffLabel(s.difference)}</td>
                            </tr>
                            {abierta && (
                              <tr className="print:hidden">
                                <td colSpan={6} className="border-b border-kr-line bg-kr-paper px-4 py-4">
                                  {breakdownLoading ? (
                                    <div className="h-5 w-40 animate-pulse rounded bg-kr-sand" />
                                  ) : breakdown ? (
                                    <div className="flex flex-wrap gap-8">
                                      <div className="flex flex-col gap-1">
                                        <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Ganancia del turno</p>
                                        <p className="font-display text-2xl tabular-nums text-kr-green-dark">{money(breakdown.profit)}</p>
                                      </div>
                                      {breakdown.byCategory.length > 0 && (
                                        <div className="flex min-w-[200px] flex-col gap-1">
                                          <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Ventas por categoría</p>
                                          {breakdown.byCategory.map((c) => (
                                            <div key={c.name} className="flex justify-between gap-6 text-sm">
                                              <span className="font-bold">{c.name}</span>
                                              <span className="font-extrabold tabular-nums">{money(c.total)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {breakdown.byProduct.length > 0 && (
                                        <div className="flex min-w-[220px] flex-col gap-1">
                                          <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Productos más vendidos</p>
                                          {breakdown.byProduct.map((p) => (
                                            <div key={p.name} className="flex justify-between gap-6 text-sm">
                                              <span className="font-bold">{p.quantity} × {p.name}</span>
                                              <span className="font-extrabold tabular-nums">{money(p.total)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* COMPRAS */}
          <section aria-label="Compras a distribuidoras" className={`${visible(seccion === 'compras')} flex-col gap-4`}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi destacado label="Gastado en distribuidoras" value={money(data.distribuidoras.totalGastado)}>
                <span className="text-xs font-bold text-kr-side-text print:text-gray-500">
                  {data.distribuidoras.facturas.length} {data.distribuidoras.facturas.length === 1 ? 'factura confirmada' : 'facturas confirmadas'}
                </span>
              </Kpi>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="print:break-inside-avoid">
                <CardTitle>Por distribuidora</CardTitle>
                {data.distribuidoras.porDistribuidora.length === 0 ? (
                  <p className="py-6 text-center text-sm font-bold text-kr-muted">Sin facturas confirmadas en este período.</p>
                ) : (
                  <div>
                    {(() => {
                      const max = Math.max(...data.distribuidoras.porDistribuidora.map((d) => d.total));
                      return data.distribuidoras.porDistribuidora.map((d) => (
                        <BarRow
                          key={d.distribuidorId}
                          label={d.nombre}
                          sub={`${d.facturasCount} ${d.facturasCount === 1 ? 'factura' : 'facturas'}`}
                          value={d.total}
                          max={max}
                          color="bg-kr-orange"
                        />
                      ));
                    })()}
                  </div>
                )}
              </Card>
              <Card className="print:break-inside-avoid">
                <CardTitle>Facturas</CardTitle>
                <Ranking
                  vacio="Sin facturas confirmadas en este período."
                  items={data.distribuidoras.facturas.map((f) => ({
                    key: f.id,
                    nombre: f.distribuidorNombre,
                    detalle: f.confirmedAt ? formatDateTime(f.confirmedAt) : undefined,
                    valor: money(f.total),
                  }))}
                />
              </Card>
            </div>
          </section>

          {/* cierre del documento impreso */}
          <div className="mt-2 hidden border-t-4 border-double border-gray-800 pt-4 print:block print:break-inside-avoid">
            <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas totales</span>
                <span className="font-mono font-bold">{money(data.ventas.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ganancia bruta</span>
                <span className="font-mono font-bold">{money(data.ganancia.total)}</span>
              </div>
              <div className="flex justify-between text-red-700">
                <span>(-) Faltantes de caja</span>
                <span className="font-mono font-bold">-{money(data.perdidas.faltantesCaja)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t-2 border-gray-800 pt-1.5 text-base">
                <span className="font-extrabold text-gray-900">RESULTADO NETO</span>
                <span className="font-mono font-extrabold text-gray-900">{money(data.ganancia.total - data.perdidas.faltantesCaja)}</span>
              </div>
            </div>
            <p className="mt-6 text-center text-[10px] leading-relaxed text-gray-400">
              Documento interno de gestión generado automáticamente por el panel administrativo de Kiosco Kramer.
              <br />
              No es un comprobante fiscal ni tiene validez impositiva.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
