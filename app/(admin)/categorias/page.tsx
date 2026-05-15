'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { categories, Category } from '@/lib/api';
import { Plus, PencilSimple, Trash, CaretLeft, CaretRight } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const LIMIT = 16;

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { page }],
    queryFn: () => categories.getAll({ limit: LIMIT, page }),
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.data.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-slideUp">
              <div className="relative h-32 bg-gray-100">
                {cat.imageUrl ? (
                  <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🏷️</div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{cat.name}</p>
                  {cat.parent && (
                    <p className="text-[11px] text-orange-400 font-semibold truncate">↳ {cat.parent.name}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link
                    href={`/categorias/${cat.id}/editar`}
                    aria-label={`Editar ${cat.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    <PencilSimple size={14} weight="bold" />
                  </Link>
                  <button
                    onClick={() => setToDelete(cat)}
                    aria-label={`Eliminar ${cat.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
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
          <span className="text-sm font-semibold text-gray-600">
            {page} de {totalPages}
          </span>
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
          message={`¿Eliminar la categoría "${toDelete.name}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </div>
  );
}
