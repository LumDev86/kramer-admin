'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { products } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import ProductForm from '@/components/forms/ProductForm';

export default function EditarProductoPage() {
  const { id } = useParams() as { id: string };

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => products.getById(id),
  });

  return (
    <>
      <PageHeader title="Editar producto" back={{ href: '/productos', label: 'Productos' }} />
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="h-[520px] animate-pulse rounded-2xl bg-white" />
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">
          No se pudo cargar el producto: {(error as Error).message}
        </p>
      ) : (
        product && <ProductForm product={product} />
      )}
    </>
  );
}
