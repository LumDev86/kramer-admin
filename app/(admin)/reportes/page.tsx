'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { reportes, cashSessions, TipoPeriodo } from '@/lib/api';
import { CaretDown, CaretLeft, CaretRight, Printer, TrendUp, TrendDown } from '@phosphor-icons/react';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const diffColor = (diff: string | null) => {
  if (diff === null) return 'text-gray-400';
  const n = Number(diff);
  if (n === 0) return 'text-green-600';
  return n < 0 ? 'text-red-500' : 'text-amber-500';
};

const diffLabel = (diff: string | null) => {
  if (diff === null) return '—';
  const n = Number(diff);
  const sign = n > 0 ? '+' : '';
  return `${sign}${money(diff)}${n < 0 ? ' (faltante)' : n > 0 ? ' (sobrante)' : ''}`;
};

const TABS: { value: TipoPeriodo; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

const formatPeriodoLabel = (periodo: { tipo: TipoPeriodo; desde: string; hasta: string }): string => {
  const desde = new Date(`${periodo.desde}T00:00:00`);
  const hasta = new Date(`${periodo.hasta}T00:00:00`);
  if (periodo.tipo === 'dia') {
    return desde.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
    return <span className="text-[11px] text-gray-400 font-semibold">Sin período anterior para comparar</span>;
  }
  const up = pct >= 0;
  const Icon = up ? TrendUp : TrendDown;
  return (
    <span className={`text-[11px] font-bold flex items-center gap-1 ${up ? 'text-green-600' : 'text-red-500'}`}>
      <Icon size={12} weight="bold" />
      {Math.abs(pct).toFixed(1)}% vs. período anterior
    </span>
  );
};

export default function ReportesPage() {
  const [tipo, setTipo] = useState<TipoPeriodo>('dia');
  const [fecha, setFecha] = useState(() => new Date());
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

  return (
    <div className="flex flex-col gap-6" id="reporte-imprimible">
      <div className="hidden print:flex items-start justify-between gap-4 pb-4 mb-4 border-b-4 border-double border-gray-800">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image src="/logo.png" alt="Kiosco Kramer" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">KIOSCO KRAMER</h1>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">Panel de administración</p>
          </div>
        </div>
        <div className="text-right border border-gray-800 rounded px-4 py-2 min-w-[220px]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reporte de gestión</p>
          <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">{data ? numeroDocumento(data.periodo) : ''}</p>
          <p className="text-xs text-gray-700 font-semibold mt-1">{data ? formatPeriodoLabel(data.periodo) : ''}</p>
          <p className="text-[10px] text-gray-400 mt-1">Emitido {new Date().toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Resumen completo del negocio por período</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Printer size={16} weight="bold" />
          Imprimir / Compartir PDF
        </button>
      </div>

      <div className="print:hidden bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => cambiarTipo(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tipo === t.value ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <CaretLeft size={14} weight="bold" />
          </button>
          <p className="text-sm font-bold text-gray-700 min-w-[220px] text-center">
            {data ? formatPeriodoLabel(data.periodo) : '...'}
          </p>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <CaretRight size={14} weight="bold" />
          </button>
          <button
            onClick={() => setFecha(new Date())}
            className="text-xs font-bold text-orange-500 hover:text-orange-600 ml-2"
          >
            Hoy
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas totales</p>
              <p className="text-2xl font-extrabold text-gray-800">{money(data.ventas.total)}</p>
              <p className="text-xs text-gray-400">{data.ventas.count} tickets</p>
              <VariacionBadge pct={data.ventas.variacionPct} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ganancia</p>
              <p className="text-2xl font-extrabold text-green-600">{money(data.ganancia.total)}</p>
              <p className="text-xs text-gray-400">Margen {data.ganancia.margenPct.toFixed(1)}%</p>
              <VariacionBadge pct={data.ganancia.variacionPct} />
              <p className="text-[11px] text-gray-400 mt-1">
                Resultado neto tras faltantes: <span className="font-bold text-gray-600">{money(data.ganancia.total - data.perdidas.faltantesCaja)}</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pérdidas (faltantes de caja)</p>
              <p className={`text-2xl font-extrabold ${data.perdidas.faltantesCaja > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {money(data.perdidas.faltantesCaja)}
              </p>
              <p className="text-xs text-gray-400">{data.perdidas.turnosConFaltante} turno{data.perdidas.turnosConFaltante !== 1 ? 's' : ''} con faltante</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5 flex flex-col gap-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ticket promedio</p>
              <p className="text-2xl font-extrabold text-gray-800">{money(data.ventas.ticketPromedio)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Efectivo</p>
              <p className="text-xl font-extrabold text-gray-800 mt-1">{money(data.ventas.byMethod.CASH)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Transferencia</p>
              <p className="text-xl font-extrabold text-gray-800 mt-1">{money(data.ventas.byMethod.TRANSFER)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Crédito</p>
              <p className="text-xl font-extrabold text-gray-800 mt-1">{money(data.ventas.byMethod.CREDIT)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas en el local</p>
              <p className="text-xl font-extrabold text-gray-800 mt-1">{money(data.ventas.byChannel.POS.total)}</p>
              <p className="text-xs text-gray-400">{data.ventas.byChannel.POS.count} ticket{data.ventas.byChannel.POS.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas por pedidos (delivery)</p>
              <p className="text-xl font-extrabold text-gray-800 mt-1">{money(data.ventas.byChannel.DELIVERY.total)}</p>
              <p className="text-xs text-gray-400">{data.ventas.byChannel.DELIVERY.count} pedido{data.ventas.byChannel.DELIVERY.count !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid p-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Movimiento de crédito</p>
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Crédito otorgado</p>
                <p className="text-lg font-extrabold text-gray-800">{money(data.fiado.otorgado)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Cobrado</p>
                <p className="text-lg font-extrabold text-green-600">{money(data.fiado.cobrado)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-700">Ventas por categoría</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.ventasPorCategoria.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Sin ventas en este período.</p>
                ) : (
                  data.ventasPorCategoria.map((c) => (
                    <div key={c.name} className="flex justify-between px-5 py-2.5 text-sm">
                      <span className="text-gray-500">{c.name}</span>
                      <span className="font-semibold text-gray-700">{money(c.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-700">Productos más vendidos</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.productosMasVendidos.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Sin ventas en este período.</p>
                ) : (
                  data.productosMasVendidos.map((p) => (
                    <div key={p.productId ?? p.name} className="flex justify-between px-5 py-2.5 text-sm gap-3">
                      <span className="text-gray-500 truncate">{p.quantity} × {p.name}</span>
                      <span className="font-semibold text-gray-700 flex-shrink-0">{money(p.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-700">Productos más rentables</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.productosMasRentables.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Sin ventas en este período.</p>
                ) : (
                  data.productosMasRentables.map((p) => (
                    <div key={p.productId ?? p.name} className="flex justify-between px-5 py-2.5 text-sm gap-3">
                      <span className="text-gray-500 truncate">{p.name}</span>
                      <span className="font-semibold text-green-600 flex-shrink-0">{money(p.profit)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-700">Productos con aumento de precio</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.productosConAumento.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">No se detectaron aumentos vs. el período anterior.</p>
                ) : (
                  data.productosConAumento.map((p) => (
                    <div key={p.productId} className="flex justify-between px-5 py-2.5 text-sm gap-3">
                      <span className="text-gray-500 truncate">{p.title}</span>
                      <span className="font-semibold text-red-500 flex-shrink-0">
                        {money(p.precioAnterior)} → {money(p.precioNuevo)} (+{p.pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">Distribuidoras</p>
              <p className="text-sm font-extrabold text-orange-500">{money(data.distribuidoras.totalGastado)}</p>
            </div>
            {data.distribuidoras.porDistribuidora.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400 font-medium">Sin facturas confirmadas en este período.</p>
            ) : (
              <>
                <div className="divide-y divide-gray-50 border-b border-gray-100">
                  {data.distribuidoras.porDistribuidora.map((d) => (
                    <div key={d.distribuidorId} className="flex justify-between px-5 py-2.5 text-sm">
                      <span className="text-gray-500">{d.nombre} <span className="text-gray-300">· {d.facturasCount} factura{d.facturasCount !== 1 ? 's' : ''}</span></span>
                      <span className="font-semibold text-gray-700">{money(d.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-gray-50">
                  {data.distribuidoras.facturas.map((f) => (
                    <div key={f.id} className="flex justify-between px-5 py-2 text-xs">
                      <span className="text-gray-400">{f.distribuidorNombre} · {f.confirmedAt && formatDateTime(f.confirmedAt)}</span>
                      <span className="font-semibold text-gray-500">{money(f.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:border print:border-gray-300 print:rounded-none print:break-inside-avoid overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-700">Cortes de caja</p>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left">
                  <th className="px-4 py-3 w-8 print:hidden" />
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Apertura</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cierre</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Inicial</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Esperado</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Contado</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.cortesDeCaja.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                      No hay cortes de caja en este período.
                    </td>
                  </tr>
                ) : (
                  data.cortesDeCaja.map((s) => (
                    <Fragment key={s.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer print:cursor-auto"
                      >
                        <td className="px-4 py-3 print:hidden">
                          <CaretDown
                            size={14}
                            weight="bold"
                            className={`text-gray-400 transition-transform ${expandedId === s.id ? 'rotate-180' : ''}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDateTime(s.openedAt)}</td>
                        <td className="px-4 py-3 text-gray-600">{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
                        <td className="px-4 py-3 font-semibold">{money(s.openingAmount)}</td>
                        <td className="px-4 py-3 font-semibold">{s.expectedAmount ? money(s.expectedAmount) : '—'}</td>
                        <td className="px-4 py-3 font-semibold">{s.closingAmount ? money(s.closingAmount) : '—'}</td>
                        <td className={`px-4 py-3 font-bold ${diffColor(s.difference)}`}>{diffLabel(s.difference)}</td>
                      </tr>
                      {expandedId === s.id && (
                        <tr className="print:hidden">
                          <td colSpan={7} className="px-4 py-4 bg-gray-50">
                            {breakdownLoading ? (
                              <div className="h-5 bg-gray-100 rounded animate-pulse w-40" />
                            ) : breakdown ? (
                              <div className="flex flex-wrap gap-8">
                                <div className="flex flex-col gap-1">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ganancia del turno</p>
                                  <p className="text-lg font-extrabold text-gray-800">{money(breakdown.profit)}</p>
                                </div>
                                {breakdown.byCategory.length > 0 && (
                                  <div className="flex flex-col gap-1 min-w-[200px]">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ventas por categoría</p>
                                    {breakdown.byCategory.map((c) => (
                                      <div key={c.name} className="flex justify-between text-sm gap-6">
                                        <span className="text-gray-500">{c.name}</span>
                                        <span className="font-semibold text-gray-700">{money(c.total)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {breakdown.byProduct.length > 0 && (
                                  <div className="flex flex-col gap-1 min-w-[220px]">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Productos más vendidos</p>
                                    {breakdown.byProduct.map((p) => (
                                      <div key={p.name} className="flex justify-between text-sm gap-6">
                                        <span className="text-gray-500">{p.quantity} × {p.name}</span>
                                        <span className="font-semibold text-gray-700">{money(p.total)}</span>
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
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="hidden print:block border-t-4 border-double border-gray-800 pt-4 mt-2 print:break-inside-avoid">
            <div className="ml-auto w-full max-w-xs flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas totales</span>
                <span className="font-mono font-semibold">{money(data.ventas.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ganancia bruta</span>
                <span className="font-mono font-semibold">{money(data.ganancia.total)}</span>
              </div>
              <div className="flex justify-between text-red-700">
                <span>(-) Faltantes de caja</span>
                <span className="font-mono font-semibold">-{money(data.perdidas.faltantesCaja)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-800 pt-1.5 mt-1 text-base">
                <span className="font-extrabold text-gray-900">RESULTADO NETO</span>
                <span className="font-mono font-extrabold text-gray-900">
                  {money(data.ganancia.total - data.perdidas.faltantesCaja)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-6 text-center leading-relaxed">
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
