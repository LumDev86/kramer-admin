'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CaretLeft, CaretRight, WhatsappLogo } from '@phosphor-icons/react';
import { sugerencias, Sugerencia, SugerenciaEstado } from '@/lib/api';
import { SUGERENCIA_ESTADO_COLOR, SUGERENCIA_ESTADO_LABEL } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/ui/SearchInput';
import Segmented from '@/components/ui/Segmented';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 20;

type Filtro = SugerenciaEstado | 'TODAS';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'NUEVA', label: 'Nuevas' },
  { value: 'CONSIGUIENDO', label: 'Consiguiendo' },
  { value: 'AGREGADA', label: 'Sumadas' },
  { value: 'DESCARTADA', label: 'Descartadas' },
];

const FILA =
  'grid items-center gap-x-3 gap-y-2 px-3 py-3 grid-cols-[minmax(0,1fr)_auto] md:px-4 md:grid-cols-[minmax(0,1fr)_64px_110px_220px_120px_20px]';

export default function SugerenciasPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const estado = filtro === 'TODAS' ? undefined : filtro;

  const { data, isLoading } = useQuery({
    queryKey: ['sugerencias', { search, estado, page }],
    queryFn: () => sugerencias.getAll({ search: search || undefined, estado, page, limit: LIMIT }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { visible?: boolean; estado?: SugerenciaEstado } }) => sugerencias.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sugerencias'] }),
    onError: (err: any) => toast.show(err.message ?? 'No se pudo guardar el cambio', 'error'),
  });

  const total = data?.meta.total ?? 0;

  return (
    <>
      <PageHeader
        title="Sugerencias"
        subtitle="Productos que los clientes piden desde la tienda. Las publicadas aparecen en el ranking “Lo que más piden los vecinos” y se pueden votar."
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented<Filtro> ariaLabel="Filtrar por estado" value={filtro} onChange={(f) => { setFiltro(f); setPage(1); }} options={FILTROS} className="max-w-full overflow-x-auto" />
        <SearchInput label="Buscar producto pedido" placeholder="Buscar producto pedido" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      <section aria-label="Sugerencias" className="overflow-hidden rounded-2xl border border-kr-line bg-white">
        <div className={`${FILA} hidden border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted md:grid`}>
          <span>Producto pedido</span>
          <span className="text-right">Votos</span>
          <span>Para avisar</span>
          <span>Estado</span>
          <span>En la tienda</span>
          <span />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-kr-sand" />)}
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
            {search || estado ? 'No hay sugerencias con ese filtro.' : 'Todavía nadie sugirió productos.'}
          </p>
        ) : (
          <ul>
            {data.data.map((s: Sugerencia) => {
              const ocupado = updateMutation.isPending && updateMutation.variables?.id === s.id;
              return (
                <li key={s.id} className={`${FILA} border-b border-dashed border-kr-line last:border-b-0 ${s.estado === 'DESCARTADA' ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <Link href={`/sugerencias/${s.id}`} className="font-extrabold leading-snug hover:text-kr-blue">
                      {s.nombre}
                    </Link>
                    <p className="text-[13px] font-bold text-kr-muted">
                      {s.tipo ?? 'Producto'} · {new Date(s.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>

                  <span className="flex flex-col items-end md:block md:text-right">
                    <span className="font-display text-2xl leading-none tabular-nums">{s.votos}</span>
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">{s.votos === 1 ? 'voto' : 'votos'}</span>
                  </span>

                  <span className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:contents">
                    <span>
                      {s.contactos > 0 ? (
                        <Link href={`/sugerencias/${s.id}`} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-kr-green-dark hover:underline">
                          <WhatsappLogo size={16} weight="fill" />
                          {s.contactos} para avisar
                        </Link>
                      ) : (
                        <span className="text-[13px] font-bold text-kr-muted">Sin contactos</span>
                      )}
                    </span>
                    <select
                      aria-label={`Estado de ${s.nombre}`}
                      value={s.estado}
                      disabled={ocupado}
                      onChange={(e) => updateMutation.mutate({ id: s.id, data: { estado: e.target.value as SugerenciaEstado } })}
                      className={`min-h-10 rounded-[10px] border-[1.5px] px-2 text-[13px] font-extrabold outline-none focus:border-kr-blue ${SUGERENCIA_ESTADO_COLOR[s.estado]}`}
                    >
                      {(Object.keys(SUGERENCIA_ESTADO_LABEL) as SugerenciaEstado[]).map((e) => (
                        <option key={e} value={e}>{SUGERENCIA_ESTADO_LABEL[e]}</option>
                      ))}
                    </select>
                    <span className="flex items-center gap-2">
                      <ToggleSwitch
                        label={`Publicar ${s.nombre} en la tienda`}
                        checked={s.visible}
                        loading={ocupado}
                        onChange={() => updateMutation.mutate({ id: s.id, data: { visible: !s.visible } })}
                      />
                      <span className="text-[13px] font-bold text-kr-muted">{s.visible ? 'Publicada' : 'Oculta'}</span>
                    </span>
                  </span>

                  <Link href={`/sugerencias/${s.id}`} aria-label={`Ver detalle de ${s.nombre}`} className="hidden text-kr-muted hover:text-kr-navy md:block">
                    <CaretRight size={18} weight="bold" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2.5 text-sm font-extrabold text-kr-muted">
          <span className="tabular-nums">Página {page} de {data.meta.totalPages} · {total} sugerencias</span>
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
