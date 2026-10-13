import PageHeader from '@/components/ui/PageHeader';
import DistribuidorForm from '@/components/forms/DistribuidorForm';

export default function NuevaDistribuidoraPage() {
  return (
    <>
      <PageHeader title="Nueva distribuidora" back={{ href: '/distribuidoras', label: 'Distribuidoras' }} />
      <DistribuidorForm />
    </>
  );
}
