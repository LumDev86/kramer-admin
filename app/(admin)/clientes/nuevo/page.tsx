import PageHeader from '@/components/ui/PageHeader';
import ClienteForm from '@/components/forms/ClienteForm';

export default function NuevoClientePage() {
  return (
    <>
      <PageHeader title="Nuevo cliente" back={{ href: '/clientes', label: 'Clientes' }} />
      <ClienteForm />
    </>
  );
}
