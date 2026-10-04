'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { sugerencias, Sugerencia, SugerenciaEstado } from '@/lib/api';
import { MagnifyingGlass, WhatsappLogo, CaretRight } from '@phosphor-icons/react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { SUGERENCIA_ESTADO_COLOR, SUGERENCIA_ESTADO_LABEL } from '@/lib/format';

const LIMIT = 20;

const FILTROS: { value: SugerenciaEstado | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'NUEVA', label: 'Nuevas' },
  { value: 'CONSIGUIENDO', label: 'Consiguiendo' },
  { value: 'AGREGADA', label: 'Sumadas' },
  { value: 'DESCARTADA', label: 'Descartadas' },
];

export default function SugerenciasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<SugerenciaEstado | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sugerencias', { search, estado, page }],
    queryFn: () => sugerencias.getAll({ search: search || undefined, estado: estado || undefined, page, limit: LIMIT }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { visible?: boolean; estado?: SugerenciaEstado } }) =>
      sugerencias.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sugerencias'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Sugerencias</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">
          Productos que piden los clientes desde la tienda. Las que marcás como <b>publicadas</b> aparecen en el
          ranking &quot;Lo que más piden los vecinos&quot;, donde otros clientes pueden sumar su voto.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.value || 'todas'}
              onClick={() => { setEstado(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                estado === f.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Votos</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-28">Para avisar</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-52">Estado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Publicada</th>
              <th className="px-4 py-3 w-10" />
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
            ) : data && data.data.length > 0 ? (
              data.data.map((s: Sugerencia) => (
                <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.estado === 'DESCARTADA' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/sugerencias/${s.id}`} className="font-semibold text-gray-800 hover:text-orange-500">
                      {s.nombre}
                    </Link>
                    {s.tipo && <p className="text-xs text-gray-400">{s.tipo}</p>}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-gray-800">{s.votos}</td>
                  <td className="px-4 py-3">
                    {s.contactos > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                        <WhatsappLogo size={14} weight="fill" />
                        {s.contactos}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={s.estado}
                      onChange={(e) => updateMutation.mutate({ id: s.id, data: { estado: e.target.value as SugerenciaEstado } })}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold outline-none ${SUGERENCIA_ESTADO_COLOR[s.estado]}`}
                    >
                      {(Object.keys(SUGERENCIA_ESTADO_LABEL) as SugerenciaEstado[]).map((e) => (
                        <option key={e} value={e}>{SUGERENCIA_ESTADO_LABEL[e]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={s.visible}
                      loading={updateMutation.isPending && updateMutation.variables?.id === s.id}
                      onChange={() => updateMutation.mutate({ id: s.id, data: { visible: !s.visible } })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sugerencias/${s.id}`}
                      aria-label={`Ver detalle de ${s.nombre}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                    >
                      <CaretRight size={15} weight="bold" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  {search || estado ? 'No hay sugerencias con ese filtro.' : 'Todavía nadie sugirió productos.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium">
              Página {data.meta.page} de {data.meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.meta.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
