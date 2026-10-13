import PageHeader from '@/components/ui/PageHeader';
import BannerForm from '@/components/forms/BannerForm';

export default function NuevoBannerPage() {
  return (
    <>
      <PageHeader title="Nuevo banner" back={{ href: '/banners', label: 'Banners' }} />
      <BannerForm />
    </>
  );
}
