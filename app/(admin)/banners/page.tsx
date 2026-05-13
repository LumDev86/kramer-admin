'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { banners, Banner } from '@/lib/api';
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function BannersPage() {
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<Banner | null>(null);

  const { data: bannerList, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => banners.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => banners.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      setToDelete(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => {
      const fd = new FormData();
      fd.append('isActive', String(!isActive));
      return banners.update(id, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Banners</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{bannerList?.length ?? 0} banners</p>
        </div>
        <Link
          href="/banners/nuevo"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} weight="bold" />
          Nuevo banner
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bannerList?.map((banner) => (
            <div key={banner.id} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-slideUp">
              <div className="flex items-center gap-4 p-4">
                <div className="relative w-40 h-20 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                  <Image src={banner.imageUrl} alt={banner.title ?? 'Banner'} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{banner.title ?? 'Sin título'}</p>
                  {banner.linkUrl && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{banner.linkUrl}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400 font-medium">Orden: {banner.order}</span>
                    <button
                      onClick={() => toggleMutation.mutate({ id: banner.id, isActive: banner.isActive })}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                        banner.isActive
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {banner.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Link
                    href={`/banners/${banner.id}/editar`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
                  >
                    <PencilSimple size={15} weight="bold" />
                  </Link>
                  <button
                    onClick={() => setToDelete(banner)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash size={15} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar el banner "${toDelete.title ?? 'sin título'}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
