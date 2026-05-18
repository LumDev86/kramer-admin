'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { products, Product } from '@/lib/api';
import { Plus, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

const LIMIT = 20;

export default function ProductosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page }],
    queryFn: () => products.getAll({ search: search || undefined, page, limit: LIMIT }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => products.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.message ?? 'Error al eliminar');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => products.toggleActive(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['products'] });
      const snapshot = qc.getQueryData<any>(['products', { search, page }]);
      const previousValue = snapshot?.data?.find((p: Product) => p.id === id)?.isActive;
      qc.setQueryData(['products', { search, page }], (old: any) => ({
        ...old,
        data: old.data.map((p: Product) =>
          p.id === id ? { ...p, isActive: !p.isActive } : p
        ),
      }));
      return { id, previousValue };
    },
    onError: (_err, _id, context) => {
      if (context?.previousValue !== undefined) {
        qc.setQueryData(['products', { search, page }], (old: any) => ({
          ...old,
          data: old.data.map((p: Product) =>
            p.id === context.id ? { ...p, isActive: context.previousValue } : p
          ),
        }));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Productos</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{data?.meta.total ?? 0} productos</p>
        </div>
        <Link
          href="/productos/nuevo"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} weight="bold" />
          Nuevo producto
        </Link>
      </div>

      <div className="relative">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar productos..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-medium"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Producto</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Categoría</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Precio</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-20">Activo</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : data?.data.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden ${!product.isActive ? 'opacity-40' : ''}`}>
                      <Image src={product.imageUrl} alt={product.title} fill sizes="40px" className="object-contain p-1" />
                    </div>
                    <span className={`font-semibold truncate max-w-xs ${product.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                      {product.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{product.category?.name ?? '—'}</td>
                <td className="px-4 py-3 font-bold text-orange-500">
                  ${parseFloat(product.price).toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-3">
                  <ToggleSwitch
                    checked={product.isActive}
                    loading={toggleMutation.isPending && toggleMutation.variables === product.id}
                    onChange={() => toggleMutation.mutate(product.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`/productos/${product.id}/editar`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                    >
                      <PencilSimple size={15} weight="bold" />
                    </Link>
                    <button
                      onClick={() => setToDelete(product)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash size={15} weight="bold" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar "${toDelete.title}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </div>
  );
}
