'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { distribuidores } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import DistribuidorForm from '@/components/forms/DistribuidorForm';

export default function EditarDistribuidoraPage() {
  const { id } = useParams() as { id: string };

  const { data: distribuidor, isLoading } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });

  return (
    <>
      <PageHeader title="Editar distribuidora" back={{ href: `/distribuidoras/${id}`, label: distribuidor?.nombre ?? 'Distribuidora' }} />
      {isLoading ? (
        <div className="h-96 w-full max-w-xl animate-pulse rounded-2xl bg-white" />
      ) : (
        distribuidor && <DistribuidorForm distribuidor={distribuidor} />
      )}
    </>
  );
}
