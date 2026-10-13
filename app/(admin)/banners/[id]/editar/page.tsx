'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { banners } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import BannerForm from '@/components/forms/BannerForm';

export default function EditarBannerPage() {
  const { id } = useParams() as { id: string };

  const { data: banner, isLoading } = useQuery({
    queryKey: ['banner', id],
    queryFn: () => banners.getById(id),
  });

  return (
    <>
      <PageHeader title="Editar banner" back={{ href: '/banners', label: 'Banners' }} />
      {isLoading ? (
        <div className="h-96 w-full max-w-xl animate-pulse rounded-2xl bg-white" />
      ) : (
        banner && <BannerForm banner={banner} />
      )}
    </>
  );
}
