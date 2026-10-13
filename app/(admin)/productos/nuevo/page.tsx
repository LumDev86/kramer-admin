import PageHeader from '@/components/ui/PageHeader';
import ProductForm from '@/components/forms/ProductForm';

export default function NuevoProductoPage() {
  return (
    <>
      <PageHeader title="Nuevo producto" back={{ href: '/productos', label: 'Productos' }} />
      <ProductForm />
    </>
  );
}
