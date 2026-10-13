'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, DotsSixVertical, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { banners, Banner } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/ui/PageHeader';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const ordenar = (lista: Banner[]) => [...lista].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

export default function BannersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<Banner | null>(null);

  const { data: bannerList, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => banners.getAll(),
    select: ordenar,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => banners.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.show('Banner eliminado');
      setToDelete(null);
    },
    onError: (err: any) => toast.show(err.message ?? 'No se pudo eliminar', 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => {
      const fd = new FormData();
      fd.append('isActive', String(!isActive));
      return banners.update(id, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
    onError: (err: any) => toast.show(err.message ?? 'No se pudo cambiar el estado', 'error'),
  });

  // guarda el orden nuevo: cada banner que cambió de lugar recibe su posición (0, 1, 2…) con
  // el mismo PUT de editar, mandando solo "order". Se muestra al instante y, si algo falla,
  // se vuelve a pedir la lista para no quedar con un orden que no es el real
  const ordenMutation = useMutation({
    mutationFn: async (nuevo: Banner[]) => {
      const cambios = nuevo.map((b, i) => ({ b, i })).filter(({ b, i }) => b.order !== i);
      await Promise.all(
        cambios.map(({ b, i }) => {
          const fd = new FormData();
          fd.append('order', String(i));
          return banners.update(b.id, fd);
        })
      );
    },
    onMutate: async (nuevo) => {
      await qc.cancelQueries({ queryKey: ['banners'] });
      qc.setQueryData<Banner[]>(['banners'], nuevo.map((b, i) => ({ ...b, order: i })));
    },
    onSuccess: () => toast.show('Orden guardado'),
    onError: (err: any) => toast.show(err.message ?? 'No se pudo guardar el orden', 'error'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  const sensors = useSensors(
    // el mouse arrastra recién después de moverse un poco, así un clic en los botones no arrastra
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // en el celular hay que mantener apretado un momento, para no pelear con el scroll
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lista = bannerList ?? [];

  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= lista.length || desde === hasta) return;
    ordenMutation.mutate(arrayMove(lista, desde, hasta));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    mover(lista.findIndex((b) => b.id === active.id), lista.findIndex((b) => b.id === over.id));
  };

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="Arrastralos (o usá Subir / Bajar) para cambiar el orden del carrusel de la tienda."
        actions={
          <Link href="/banners/nuevo" className={buttonClasses('primary', 'md')}>
            <Plus size={18} weight="bold" />
            Nuevo banner
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />)}
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border border-kr-line bg-white px-4 py-10 text-center text-sm font-bold text-kr-muted">Todavía no hay banners.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={lista.map((b) => b.id)} strategy={rectSortingStrategy}>
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((b, i) => (
                <BannerCard
                  key={b.id}
                  banner={b}
                  pos={i + 1}
                  esPrimero={i === 0}
                  esUltimo={i === lista.length - 1}
                  ocupado={ordenMutation.isPending}
                  onSubir={() => mover(i, i - 1)}
                  onBajar={() => mover(i, i + 1)}
                  onToggle={() => toggleMutation.mutate({ id: b.id, isActive: b.isActive })}
                  toggling={toggleMutation.isPending && toggleMutation.variables?.id === b.id}
                  onDelete={() => setToDelete(b)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar el banner "${toDelete.title ?? 'sin título'}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}

function BannerCard({
  banner: b, pos, esPrimero, esUltimo, ocupado, onSubir, onBajar, onToggle, toggling, onDelete,
}: {
  banner: Banner;
  pos: number;
  esPrimero: boolean;
  esUltimo: boolean;
  ocupado: boolean;
  onSubir: () => void;
  onBajar: () => void;
  onToggle: () => void;
  toggling: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white ${
        isDragging ? 'relative z-10 border-2 border-kr-navy shadow-pop-lg' : 'border border-kr-line'
      } ${b.isActive ? '' : 'opacity-70'}`}
    >
      <div className="flex items-center gap-2 border-b border-kr-line px-2 py-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Arrastrar para mover el banner ${pos}`}
          className="flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-xl text-kr-muted hover:bg-kr-sand active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={22} weight="bold" />
        </button>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-kr-navy px-1.5 font-display text-sm text-white">{pos}</span>
        <span className={`text-[13px] font-extrabold ${b.isActive ? 'text-kr-green-dark' : 'text-kr-muted'}`}>
          {b.isActive ? 'Se ve en la tienda' : 'Oculto'}
        </span>
        <span className="flex-1" />
        <ToggleSwitch label={`Banner ${pos} visible`} checked={b.isActive} loading={toggling} onChange={onToggle} />
      </div>

      <div className="relative aspect-[2/1] w-full bg-kr-sand">
        <Image src={b.imageUrl} alt={b.title ?? `Banner ${pos}`} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-snug">{b.title ?? 'Sin título'}</p>
          {b.linkUrl && <p className="break-all text-xs font-bold text-kr-muted">{b.linkUrl}</p>}
        </div>
        <Link href={`/banners/${b.id}/editar`} aria-label="Editar banner" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl hover:bg-kr-sand">
          <PencilSimple size={18} weight="bold" />
        </Link>
        <button type="button" onClick={onDelete} aria-label="Eliminar banner" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-kr-orange-dark hover:bg-[#FFE7D6]">
          <Trash size={18} weight="bold" />
        </button>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-dashed border-kr-line px-3 py-2.5">
        <button type="button" onClick={onSubir} disabled={esPrimero || ocupado} className={buttonClasses('secondary', 'sm')}>
          <ArrowUp size={14} weight="bold" />
          Subir
        </button>
        <button type="button" onClick={onBajar} disabled={esUltimo || ocupado} className={buttonClasses('secondary', 'sm')}>
          <ArrowDown size={14} weight="bold" />
          Bajar
        </button>
      </div>
    </li>
  );
}
