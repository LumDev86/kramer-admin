'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sales, cashSessions } from '@/lib/api';
import { CaretDown } from '@phosphor-icons/react';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

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

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function ReportesPage() {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(toISODate(weekAgo));
  const [to, setTo] = useState(toISODate(today));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['sales', 'summary-range', from, to],
    queryFn: () => sales.getSummaryRange(from, to),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['cash-sessions', 'history', from, to],
    queryFn: () => cashSessions.getHistory(from, to),
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['cash-session', 'breakdown', expandedId],
    queryFn: () => cashSessions.getBreakdown(expandedId!),
    enabled: !!expandedId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Reportes</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Ventas y cortes de caja por rango de fechas</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total vendido</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">{money(summary?.total ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{summary?.count ?? 0} tickets</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Efectivo</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">{money(summary?.byMethod.CASH ?? 0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Transferencia</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-1">{money(summary?.byMethod.TRANSFER ?? 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-700">Cortes de caja</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Apertura</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Cierre</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Inicial</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Esperado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Contado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {historyLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : history && history.length > 0 ? (
              history.map((s) => (
                <Fragment key={s.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
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
                    <tr>
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
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  No hay cortes de caja en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
