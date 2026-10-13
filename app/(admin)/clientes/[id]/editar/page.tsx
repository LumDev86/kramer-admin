'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { clientes } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import ClienteForm from '@/components/forms/ClienteForm';

export default function EditarClientePage() {
  const { id } = useParams() as { id: string };

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientes.getById(id),
  });

  return (
    <>
      <PageHeader
        title="Editar cliente"
        back={{ href: `/clientes/${id}`, label: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente' }}
      />
      {isLoading ? (
        <div className="h-96 w-full max-w-xl animate-pulse rounded-2xl bg-white" />
      ) : (
        cliente && <ClienteForm cliente={cliente} />
      )}
    </>
  );
}
