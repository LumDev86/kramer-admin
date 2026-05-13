import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import ProductForm from '@/components/forms/ProductForm';

export default function NuevoProductoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/productos" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Nuevo producto</h1>
      </div>
      <ProductForm />
    </div>
  );
}
