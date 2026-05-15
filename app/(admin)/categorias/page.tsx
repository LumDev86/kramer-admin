'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { categories, Category } from '@/lib/api';
import { Plus, PencilSimple, Trash, CaretLeft, CaretRight } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const LIMIT = 16;

type ToDelete = { id: string; name: string };

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ToDelete | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Solo top-level; cada una trae su array children
  const { data, isLoading } = useQuery({
    queryKey: ['categories', { page, parentId: 'null' }],
    queryFn: () => categories.getAll({ limit: LIMIT, page, parentId: 'null' }),
  });

  const totalPages = data?.meta.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.message ?? 'Error al eliminar');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Categorías</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.meta.total ?? 0} categorías</p>
        </div>
        <Link
          href="/categorias/nueva"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} weight="bold" />
          Nueva categoría
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.data.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-slideUp">

              {/* Cabecera de la categoría */}
              <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {cat.imageUrl ? (
                    <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center text-xl">🏷️</div>
                  )}
                </div>
                <p className="text-sm font-extrabold text-gray-800 flex-1 truncate">{cat.name}</p>
                <div className="flex gap-1 shrink-0">
                  <Link
                    href={`/categorias/nueva?parentId=${cat.id}`}
                    title="Nueva subcategoría"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-green-50 hover:text-green-500 transition-colors"
                  >
                    <Plus size={14} weight="bold" />
                  </Link>
                  <Link
                    href={`/categorias/${cat.id}/editar`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    <PencilSimple size={14} weight="bold" />
                  </Link>
                  <button
                    onClick={() => { setToDelete({ id: cat.id, name: cat.name }); setDeleteError(''); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Lista de subcategorías */}
              <div className="p-3 flex flex-col gap-1">
                {cat.children.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium py-1">Sin subcategorías</p>
                ) : (
                  cat.children.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
                      <div className="relative w-7 h-7 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {sub.imageUrl ? (
                          <Image src={sub.imageUrl} alt={sub.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-orange-50 flex items-center justify-center text-sm">·</div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{sub.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Link
                          href={`/categorias/${sub.id}/editar`}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                        >
                          <PencilSimple size={12} weight="bold" />
                        </Link>
                        <button
                          onClick={() => { setToDelete({ id: sub.id, name: sub.name }); setDeleteError(''); }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash size={12} weight="bold" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <span className="text-sm font-semibold text-gray-600">{page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar "${toDelete.name}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </div>
  );
}
