'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { categories } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import CategoryForm from '@/components/forms/CategoryForm';

export default function EditarCategoriaPage() {
  const { id } = useParams() as { id: string };

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => categories.getById(id),
  });

  return (
    <>
      <PageHeader title="Editar categoría" back={{ href: '/categorias', label: 'Categorías' }} />
      {isLoading ? (
        <div className="h-96 w-full max-w-xl animate-pulse rounded-2xl bg-white" />
      ) : (
        category && <CategoryForm category={category} />
      )}
    </>
  );
}
