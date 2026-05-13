import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import BannerForm from '@/components/forms/BannerForm';

export default function NuevoBannerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/banners" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Nuevo banner</h1>
      </div>
      <BannerForm />
    </div>
  );
}
