'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { banners } from '@/lib/api';
import BannerForm from '@/components/forms/BannerForm';

export default function EditarBannerPage() {
  const { id } = useParams() as { id: string };

  const { data: banner, isLoading } = useQuery({
    queryKey: ['banner', id],
    queryFn: () => banners.getById(id),
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/banners" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Editar banner</h1>
      </div>
      {banner && <BannerForm banner={banner} />}
    </div>
  );
}
