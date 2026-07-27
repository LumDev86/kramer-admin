'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { distribuidores, Distribuidor } from '@/lib/api';
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DistribuidorasPage() {
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<Distribuidor | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['distribuidores'], queryFn: distribuidores.getAll });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => distribuidores.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribuidores'] });
      setToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.message ?? 'Error al eliminar'),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Distribuidoras</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.length ?? 0} distribuidoras</p>
        </div>
        <Link
          href="/distribuidoras/nueva"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} weight="bold" />
          Nueva distribuidora
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Teléfono</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Total gastado</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data && data.length > 0 ? (
              data.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/distribuidoras/${d.id}`} className="font-semibold text-gray-800 hover:text-orange-500">
                      {d.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.telefono ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-orange-500">{money(d.totalGastado ?? 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link
                        href={`/distribuidoras/${d.id}/editar`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                      >
                        <PencilSimple size={15} weight="bold" />
                      </Link>
                      <button
                        onClick={() => setToDelete(d)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash size={15} weight="bold" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 font-medium">
                  Todavía no hay distribuidoras cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar "${toDelete.nombre}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </div>
  );
}
