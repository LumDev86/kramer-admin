'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CaretRight, Plus, Truck } from '@phosphor-icons/react';
import { distribuidores } from '@/lib/api';
import { money } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/ui/SearchInput';
import Chip from '@/components/ui/Chip';
import { buttonClasses } from '@/components/ui/Button';

const FILA = 'grid items-center gap-x-3 gap-y-1 px-3 py-3 grid-cols-[minmax(0,1fr)_auto_20px] md:px-4 md:grid-cols-[minmax(0,1fr)_170px_150px_20px]';

export default function DistribuidorasPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['distribuidores'], queryFn: distribuidores.getAll });

  const lista = (data ?? []).filter((d) => d.nombre.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <PageHeader
        title="Distribuidoras"
        subtitle={data ? `${data.length} distribuidoras` : undefined}
        actions={
          <Link href="/distribuidoras/nueva" className={buttonClasses('primary', 'md')}>
            <Plus size={18} weight="bold" />
            Nueva distribuidora
          </Link>
        }
      />

      <SearchInput
        label="Buscar distribuidora"
        placeholder="Buscar distribuidora"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-none basis-auto md:max-w-md"
      />

      <section aria-label="Distribuidoras" className="overflow-hidden rounded-2xl border border-kr-line bg-white">
        <div className={`${FILA} hidden border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted md:grid`}>
          <span>Distribuidora</span>
          <span>Precios</span>
          <span className="text-right">Total gastado</span>
          <span />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-kr-sand" />)}
          </div>
        ) : lista.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
            {data && data.length > 0 ? `No hay distribuidoras que coincidan con "${search.trim()}".` : 'Todavía no hay distribuidoras cargadas.'}
          </p>
        ) : (
          <ul>
            {lista.map((d) => {
              const iva = (
                <Chip tone={d.ivaDiscriminado ? 'info' : 'neutral'}>{d.ivaDiscriminado ? 'IVA discriminado' : 'IVA incluido'}</Chip>
              );
              return (
                <li key={d.id} className="border-b border-dashed border-kr-line last:border-b-0">
                  <Link href={`/distribuidoras/${d.id}`} className={`${FILA} hover:bg-kr-paper`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-kr-line bg-kr-sand text-kr-muted">
                        <Truck size={22} weight="bold" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold leading-snug">{d.nombre}</span>
                        <span className="block text-[13px] font-bold text-kr-muted">{d.telefono ?? 'Sin teléfono'}</span>
                        <span className="mt-1 block md:hidden">{iva}</span>
                      </span>
                    </span>
                    <span className="hidden md:block">{iva}</span>
                    <span className="text-right">
                      <span className="block text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Gastado</span>
                      <span className="text-base font-extrabold tabular-nums">{money(d.totalGastado ?? 0)}</span>
                    </span>
                    <CaretRight size={18} weight="bold" className="text-kr-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
