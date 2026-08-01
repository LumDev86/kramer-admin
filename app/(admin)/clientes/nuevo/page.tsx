'use client';

import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import ClienteForm from '@/components/forms/ClienteForm';

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="text-gray-400 hover:text-gray-600 transition-colors">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-800">Nuevo cliente</h1>
      </div>
      <ClienteForm />
    </div>
  );
}
