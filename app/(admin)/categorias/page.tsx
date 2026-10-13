'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { CaretRight, PencilSimple, Plus, Tag, Trash } from '@phosphor-icons/react';
import { categories, Category } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/ui/SearchInput';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

type ToDelete = { id: string; name: string };

// fondo de la miniatura cuando la categoría no tiene imagen, para distinguirlas de un vistazo
const TINTES = ['#DCEAFF', '#FFF1C2', '#FFE0EC', '#FFE7D6', '#E3F9EC', '#EEE9DE'];

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const iconBtn = 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-kr-navy hover:bg-kr-sand';

export default function CategoriasPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = useState<ToDelete | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Solo top-level; cada una trae su array children. Son pocas: se traen todas (el server
  // corta en 100) y el buscador filtra acá mismo
  const { data, isLoading } = useQuery({
    queryKey: ['categories', { parentId: 'null', limit: 100 }],
    queryFn: () => categories.getAll({ parentId: 'null', limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.show(`Se eliminó "${toDelete?.name}"`);
      setToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.message ?? 'Error al eliminar');
    },
  });

  const todas = data?.data ?? [];
  const totalSubs = todas.reduce((s, c) => s + c.children.length, 0);
  // si ninguna tiene subcategorías, la columna de la flecha solo le saca lugar al nombre
  const hayArbol = totalSubs > 0;
  const q = normalizar(search.trim());

  // buscando: quedan las categorías que coinciden o que tienen alguna subcategoría que coincide,
  // y se abren solas para mostrar dónde está
  const visibles: { cat: Category; subs: Category['children']; abierta: boolean }[] = todas.flatMap((cat) => {
    if (!q) return [{ cat, subs: cat.children, abierta: !!abiertas[cat.id] }];
    const coincidePadre = normalizar(cat.name).includes(q);
    const subs = coincidePadre ? cat.children : cat.children.filter((s) => normalizar(s.name).includes(q));
    if (!coincidePadre && subs.length === 0) return [];
    return [{ cat, subs, abierta: subs.length > 0 }];
  });

  const toggle = (id: string) => setAbiertas((a) => ({ ...a, [id]: !a[id] }));

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle={data ? `${todas.length} categorías · ${totalSubs} subcategorías` : undefined}
        actions={
          <Link href="/categorias/nueva" className={buttonClasses('primary', 'md')}>
            <Plus size={18} weight="bold" />
            Nueva categoría
          </Link>
        }
      />

      <SearchInput
        label="Buscar categoría"
        placeholder="Buscar categoría o subcategoría"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-none basis-auto md:max-w-md"
      />

      <section aria-label="Árbol de categorías" className="overflow-hidden rounded-2xl border border-kr-line bg-white">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-kr-sand" />)}
          </div>
        ) : visibles.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm font-bold text-kr-muted">
            {q ? `No hay categorías que coincidan con "${search.trim()}".` : 'Todavía no hay categorías.'}
          </p>
        ) : (
          <ul>
            {visibles.map(({ cat, subs, abierta }, i) => (
              <li key={cat.id} className="border-b border-dashed border-kr-line last:border-b-0">
                <div className={`flex items-center gap-2 py-2.5 pr-2.5 sm:gap-3 sm:py-3 sm:pr-4 ${hayArbol ? 'pl-1 sm:pl-2' : 'pl-3 sm:pl-4'}`}>
                  {hayArbol && (
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    disabled={cat.children.length === 0 || !!q}
                    aria-expanded={abierta}
                    aria-label={`${abierta ? 'Ocultar' : 'Ver'} subcategorías de ${cat.name}`}
                    className={`${iconBtn} disabled:opacity-30 ${cat.children.length === 0 ? 'invisible' : ''}`}
                  >
                    <CaretRight size={18} weight="bold" className={`transition-transform duration-150 ${abierta ? 'rotate-90' : ''}`} />
                  </button>
                  )}
                  <span
                    className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-[1.5px] border-kr-navy sm:h-14 sm:w-14"
                    style={{ background: TINTES[i % TINTES.length] }}
                  >
                    {cat.imageUrl ? (
                      <Image src={cat.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <Tag size={24} weight="bold" />
                    )}
                  </span>
                  <button type="button" onClick={() => !q && cat.children.length > 0 && toggle(cat.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-base font-extrabold leading-snug">{cat.name}</span>
                    <span className="block text-xs font-bold text-kr-muted">
                      {cat.children.length === 0 ? 'Sin subcategorías' : `${cat.children.length} ${cat.children.length === 1 ? 'subcategoría' : 'subcategorías'}`}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Link
                      href={`/categorias/nueva?parentId=${cat.id}`}
                      aria-label={`Nueva subcategoría en ${cat.name}`}
                      className={buttonClasses('secondary', 'sm', 'w-10 !px-0 sm:w-auto sm:!px-3')}
                    >
                      <Plus size={16} weight="bold" />
                      <span className="hidden sm:inline">Subcategoría</span>
                    </Link>
                    <Link href={`/categorias/${cat.id}/editar`} aria-label={`Editar ${cat.name}`} className={iconBtn}>
                      <PencilSimple size={18} weight="bold" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setToDelete({ id: cat.id, name: cat.name }); setDeleteError(''); }}
                      aria-label={`Eliminar ${cat.name}`}
                      className={`${iconBtn} text-kr-orange-dark hover:bg-[#FFE7D6]`}
                    >
                      <Trash size={18} weight="bold" />
                    </button>
                  </div>
                </div>

                {abierta && subs.length > 0 && (
                  <ul className="flex flex-col gap-1.5 pb-3 pl-6 pr-2.5 sm:pl-[76px] sm:pr-4">
                    {subs.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-2.5 rounded-xl border border-[#F0E6D2] bg-kr-paper py-1.5 pl-2.5 pr-1.5">
                        <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-kr-sand text-kr-muted">
                          {sub.imageUrl ? <Image src={sub.imageUrl} alt="" fill sizes="36px" className="object-cover" /> : <Tag size={18} weight="bold" />}
                        </span>
                        <span className="min-w-0 flex-1 font-extrabold">{sub.name}</span>
                        <Link href={`/categorias/${sub.id}/editar`} aria-label={`Editar ${sub.name}`} className={iconBtn}>
                          <PencilSimple size={18} weight="bold" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setToDelete({ id: sub.id, name: sub.name }); setDeleteError(''); }}
                          aria-label={`Eliminar ${sub.name}`}
                          className={`${iconBtn} text-kr-orange-dark hover:bg-[#FFE7D6]`}
                        >
                          <Trash size={18} weight="bold" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar "${toDelete.name}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </>
  );
}
