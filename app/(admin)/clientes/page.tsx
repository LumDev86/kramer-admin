'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { clientes, Cliente } from '@/lib/api';
import { Plus, PencilSimple, MagnifyingGlass } from '@phosphor-icons/react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { money } from '@/lib/format';

const LIMIT = 20;

export default function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', { search, page }],
    queryFn: () => clientes.getAll({ search: search || undefined, page, limit: LIMIT }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => clientes.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.meta.total ?? 0} clientes</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} weight="bold" />
          Nuevo cliente
        </Link>
      </div>

      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, apodo o teléfono..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Teléfono</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Deuda</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Activo</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data && data.data.length > 0 ? (
              data.data.map((c: Cliente) => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="font-semibold text-gray-800 hover:text-orange-500">
                      {c.nombre} {c.apellido}
                    </Link>
                    {c.passwordResetRequestedAt && (
                      <span className="ml-1.5 text-[10px] font-bold text-red-500 align-middle">🔔 Pidió recuperar contraseña</span>
                    )}
                    {c.apodo && <p className="text-xs text-gray-400">{c.apodo}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.telefono ?? '—'}</td>
                  <td className={`px-4 py-3 font-bold ${(c.deuda ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {money(c.deuda ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={c.isActive}
                      loading={toggleMutation.isPending && toggleMutation.variables === c.id}
                      onChange={() => toggleMutation.mutate(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${c.id}/editar`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  Todavía no hay clientes cargados.
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
