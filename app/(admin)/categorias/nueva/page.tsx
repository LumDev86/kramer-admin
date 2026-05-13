import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import CategoryForm from '@/components/forms/CategoryForm';

export default function NuevaCategoriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/categorias" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Nueva categoría</h1>
      </div>
      <CategoryForm />
    </div>
  );
}
