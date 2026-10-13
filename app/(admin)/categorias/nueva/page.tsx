'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import CategoryForm from '@/components/forms/CategoryForm';

function NuevaCategoriaContent() {
  const searchParams = useSearchParams();
  const parentId = searchParams.get('parentId') ?? undefined;

  return (
    <>
      <PageHeader title={parentId ? 'Nueva subcategoría' : 'Nueva categoría'} back={{ href: '/categorias', label: 'Categorías' }} />
      <CategoryForm initialParentId={parentId} />
    </>
  );
}

export default function NuevaCategoriaPage() {
  return (
    <Suspense>
      <NuevaCategoriaContent />
    </Suspense>
  );
}
