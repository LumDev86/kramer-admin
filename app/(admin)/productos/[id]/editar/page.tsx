'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { products } from '@/lib/api';
import ProductForm from '@/components/forms/ProductForm';

export default function EditarProductoPage() {
  const { id } = useParams() as { id: string };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => products.getById(id),
  });

  if (isLoading) {
    return <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/productos" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Editar producto</h1>
      </div>
      {product && <ProductForm product={product} />}
    </div>
  );
}
