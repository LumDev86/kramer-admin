'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { clientes, Cliente } from '@/lib/api';
import { money } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/ui/SearchInput';
import Segmented from '@/components/ui/Segmented';
import Chip from '@/components/ui/Chip';
import { buttonClasses } from '@/components/ui/Button';
import BarraLimite from '@/components/clientes/BarraLimite';

const LIMIT = 20;

type Filtro = 'todos' | 'reset';

const FILA =
  'grid items-center gap-x-3 gap-y-2 px-3 py-3 grid-cols-[minmax(0,1fr)_auto_20px] md:px-4 md:grid-cols-[minmax(0,1fr)_150px_170px_130px_20px]';

export default function ClientesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', { search, page, filtro }],
    queryFn: () => clientes.getAll({ search: search || undefined, page, limit: LIMIT, resetPendiente: filtro === 'reset' || undefined }),
  });

  // misma query que el aviso del menú lateral: el contador sale sin pedir nada extra
  const { data: resetPendientes } = useQuery({
    queryKey: ['clientes', 'reset-pendientes'],
    queryFn: () => clientes.getAll({ resetPendiente: true, limit: 1 }),
  });

  const total = data?.meta.total ?? 0;
  const desde = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const hasta = Math.min(page * LIMIT, total);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={data && filtro === 'todos' ? `${total.toLocaleString('es-AR')} clientes` : undefined}
        actions={
          <Link href="/clientes/nuevo" className={buttonClasses('primary', 'md')}>
            <Plus size={18} weight="bold" />
            Nuevo cliente
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented<Filtro>
          ariaLabel="Filtro de clientes"
          value={filtro}
          onChange={(f) => { setFiltro(f); setPage(1); }}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'reset', label: 'Pidieron contraseña', count: resetPendientes?.meta.total },
          ]}
        />
        <SearchInput
          label="Buscar cliente"
          placeholder="Buscar por nombre, apodo o teléfono"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <section aria-label="Clientes" className="overflow-hidden rounded-2xl border border-kr-line bg-white">
        <div className={`${FILA} hidden border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted md:grid`}>
          <span>Cliente</span>
          <span>Teléfono</span>
          <span>Uso del límite</span>
          <span className="text-right">Deuda</span>
          <span />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-kr-sand" />)}
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
            {filtro === 'reset'
              ? 'Nadie está esperando una contraseña nueva.'
              : search
              ? `No hay clientes que coincidan con "${search}".`
              : 'Todavía no hay clientes cargados.'}
          </p>
        ) : (
          <ul>
            {data.data.map((c: Cliente) => {
              const deuda = c.deuda ?? 0;
              return (
                <li key={c.id} className="border-b border-dashed border-kr-line last:border-b-0">
                  <Link href={`/clientes/${c.id}`} className={`${FILA} hover:bg-kr-paper`}>
                    <span className="min-w-0">
                      <span className={`block font-extrabold leading-snug ${c.isActive ? '' : 'text-kr-muted'}`}>
                        {c.nombre} {c.apellido}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-kr-muted">
                        {c.apodo && <span>“{c.apodo}”</span>}
                        <span className="md:hidden">{c.telefono ?? 'Sin teléfono'}</span>
                        {c.passwordResetRequestedAt && <Chip tone="info">Pidió contraseña</Chip>}
                        {!c.isActive && <Chip tone="off">Dado de baja</Chip>}
                      </span>
                      {Number(c.creditLimit) > 0 && <span className="mt-2 block md:hidden"><BarraLimite deuda={deuda} limite={c.creditLimit} /></span>}
                    </span>
                    <span className="hidden text-sm font-bold text-kr-muted md:block">{c.telefono ?? '—'}</span>
                    <span className="hidden md:block"><BarraLimite deuda={deuda} limite={c.creditLimit} /></span>
                    <span className={`text-right text-base font-extrabold tabular-nums ${deuda > 0 ? 'text-kr-orange-dark' : 'text-kr-muted'}`}>
                      {money(deuda)}
                    </span>
                    <CaretRight size={18} weight="bold" className="text-kr-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data && total > LIMIT && (
        <div className="flex items-center justify-end gap-2.5 text-sm font-extrabold text-kr-muted">
          <span className="tabular-nums">{desde}–{hasta} de {total.toLocaleString('es-AR')}</span>
          <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Página anterior" className={buttonClasses('secondary', 'md', 'w-11 !px-0')}>
            <CaretLeft size={18} weight="bold" />
          </button>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages} aria-label="Página siguiente" className={buttonClasses('secondary', 'md', 'w-11 !px-0')}>
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      )}
    </>
  );
}
