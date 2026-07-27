'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { distribuidores } from '@/lib/api';
import DistribuidorForm from '@/components/forms/DistribuidorForm';

export default function EditarDistribuidoraPage() {
  const { id } = useParams() as { id: string };

  const { data: distribuidor, isLoading } = useQuery({
    queryKey: ['distribuidor', id],
    queryFn: () => distribuidores.getById(id),
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/distribuidoras" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Editar distribuidora</h1>
      </div>
      {distribuidor && <DistribuidorForm distribuidor={distribuidor} />}
    </div>
  );
}
