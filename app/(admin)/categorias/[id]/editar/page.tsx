'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { categories } from '@/lib/api';
import CategoryForm from '@/components/forms/CategoryForm';

export default function EditarCategoriaPage() {
  const { id } = useParams() as { id: string };

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => categories.getById(id),
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/categorias" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Editar categoría</h1>
      </div>
      {category && <CategoryForm category={category} />}
    </div>
  );
}
