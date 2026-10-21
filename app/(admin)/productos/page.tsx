'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { CaretLeft, CaretRight, DotsThree, Package, Plus } from '@phosphor-icons/react';
import { products, categories, Product, Category, PaginatedResponse } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import PageHeader from '@/components/ui/PageHeader';
import SearchInput from '@/components/ui/SearchInput';
import Chip from '@/components/ui/Chip';
import { buttonClasses } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import CeldaNumero from '@/components/productos/CeldaNumero';
import { gananciaPct, pctValor, precioConGanancia, precioManteniendoMargen } from '@/components/productos/precio';

const LIMIT = 20;

// celular: nombre arriba a lo ancho y costo/precio/ganancia/stock abajo.
// tablet: una fila, la categoría va debajo del nombre. escritorio: la categoría tiene columna propia.
// La columna Producto se queda con todo el ancho que sobra: los nombres no se recortan nunca.
const FILA =
  "grid items-center gap-x-2 gap-y-2.5 px-3 py-3 grid-cols-[repeat(3,minmax(0,1fr))_44px] [grid-template-areas:'n_n_n_x'_'c_p_g_s'] " +
  "md:gap-x-3 md:px-4 md:py-2.5 md:grid-cols-[minmax(0,1fr)_96px_96px_76px_56px_44px] md:[grid-template-areas:'n_c_p_g_s_x'] " +
  "xl:grid-cols-[minmax(0,1fr)_170px_104px_104px_84px_64px_44px] xl:[grid-template-areas:'n_k_c_p_g_s_x']";

// el buscador del server mira nombre y descripción; si lo tipeado es un código de barras
// (solo números, largo), se busca por código, así funciona también con el lector
const esCodigo = (s: string) => /^\d{6,}$/.test(s);

type CampoEditado = 'costo' | 'precio' | 'ganancia';
type ProductFieldEdit = { product: Product; field: CampoEditado; data: { price?: number; cost?: number | null } };

const CAMPO_LABEL: Record<CampoEditado, string> = { costo: 'el costo', precio: 'el precio', ganancia: 'la ganancia' };

export default function ProductosPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // espera a que se termine de tipear para no pedir una búsqueda por letra
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: allCategories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categories.getAll({ limit: 200 }),
  });

  const allCats = allCategories?.data ?? [];
  const parentCategories = allCats.filter((c: Category) => c.parentId === null);
  const subcategories = categoryId ? allCats.filter((c: Category) => c.parentId === categoryId) : [];
  // el producto trae su categoría sin el padre: se arma "Bebidas › Gaseosas" con la lista completa
  const rutaCategoria = (p: Product) => {
    if (!p.category) return null;
    const cat = allCats.find((c) => c.id === p.category!.id);
    return cat?.parent ? `${cat.parent.name} › ${p.category.name}` : p.category.name;
  };

  const productFilter = subcategoryId
    ? { categoryId: subcategoryId }
    : categoryId
    ? { parentCategoryId: categoryId }
    : {};

  // el optimistic update del toggle escribe sobre esta misma key exacta - si se agrega un
  // filtro nuevo al listado, tiene que entrar acá o el toggle deja de encontrar la query
  const productsKey = ['products', { search, page, categoryId, subcategoryId }];

  const { data, isLoading } = useQuery({
    queryKey: productsKey,
    queryFn: async (): Promise<PaginatedResponse<Product>> => {
      if (esCodigo(search)) {
        const p = await products.getByBarcode(search);
        return { data: p ? [p] : [], meta: { total: p ? 1 : 0, page: 1, limit: LIMIT, totalPages: 1 } };
      }
      return products.getAll({ search: search || undefined, page, limit: LIMIT, ...productFilter });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => products.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.show(`Se eliminó "${toDelete?.title}"`);
      setToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.message ?? 'Error al eliminar');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => products.toggleActive(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['products'] });
      const snapshot = qc.getQueryData<any>(productsKey);
      const previousValue = snapshot?.data?.find((p: Product) => p.id === id)?.isActive;
      qc.setQueryData(productsKey, (old: any) => old && ({
        ...old,
        data: old.data.map((p: Product) =>
          p.id === id ? { ...p, isActive: !p.isActive } : p
        ),
      }));
      return { id, previousValue, key: productsKey };
    },
    onError: (err: any, _id, context) => {
      if (context?.previousValue !== undefined) {
        qc.setQueryData(context.key, (old: any) => old && ({
          ...old,
          data: old.data.map((p: Product) =>
            p.id === context.id ? { ...p, isActive: context.previousValue } : p
          ),
        }));
      }
      toast.show(err.message ?? 'No se pudo cambiar el estado', 'error');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  // Costo, Precio y Ganancia son tres campos vinculados (ver components/productos/precio.ts):
  // tocar cualquiera de los tres manda un único PUT parcial con los campos que corresponda
  const updateProductMutation = useMutation({
    mutationFn: ({ product, data }: ProductFieldEdit) => {
      const form = new FormData();
      if (data.price !== undefined) form.append('price', String(data.price));
      if (data.cost !== undefined) form.append('cost', data.cost === null ? '' : String(data.cost));
      return products.update(product.id, form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (err: any, { product, field }) => {
      toast.show(`No se pudo guardar ${CAMPO_LABEL[field]} de "${product.title}": ${err.message ?? 'error'}`, 'error');
    },
  });

  const total = data?.meta.total ?? 0;
  const desde = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const hasta = Math.min(page * LIMIT, total);

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={data ? `${total.toLocaleString('es-AR')} productos` : undefined}
        actions={
          <Link href="/productos/nuevo" className={buttonClasses('primary', 'md')}>
            <Plus size={18} weight="bold" />
            Nuevo producto
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label="Buscar producto"
          placeholder="Buscar por nombre o código de barras"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="basis-full md:basis-72"
        />
        <select
          aria-label="Categoría"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); setPage(1); }}
          className={inputClasses('flex-1 !w-auto bg-white md:flex-none md:min-w-48')}
        >
          <option value="">Todas las categorías</option>
          {parentCategories.map((c: Category) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {subcategories.length > 0 && (
          <select
            aria-label="Subcategoría"
            value={subcategoryId}
            onChange={(e) => { setSubcategoryId(e.target.value); setPage(1); }}
            className={inputClasses('flex-1 !w-auto bg-white md:flex-none md:min-w-48 animate-fadeIn')}
          >
            <option value="">Todas las subcategorías</option>
            {subcategories.map((c: Category) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
      {esCodigo(search) && (categoryId || subcategoryId) && (
        <p className="-mt-2 text-xs font-bold text-kr-muted">Buscando por código de barras: el filtro de categoría no se aplica.</p>
      )}

      {/* sin overflow-hidden: el menú de "más acciones" de las últimas filas tiene que poder asomar */}
      <section aria-label="Lista de productos" className="rounded-2xl border border-kr-line bg-white">
        <div className={`${FILA} hidden md:grid rounded-t-2xl border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted`}>
          <span className="[grid-area:n]">Producto</span>
          <span className="hidden xl:block [grid-area:k]">Categoría</span>
          <span className="text-right [grid-area:c]">Costo</span>
          <span className="text-right [grid-area:p]">Precio</span>
          <span className="text-right [grid-area:g]">Ganancia</span>
          <span className="text-center [grid-area:s]">Stock</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-kr-sand" />)}
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm font-bold text-kr-muted">
            {search ? `No hay productos que coincidan con "${search}".` : 'No hay productos para mostrar.'}
          </p>
        ) : (
          <ul>
            {data.data.map((product) => {
              const costNum = product.cost ? parseFloat(product.cost) : null;
              const priceNum = parseFloat(product.price);
              const pct = gananciaPct(costNum, priceNum);
              const rowBusy = updateProductMutation.isPending && updateProductMutation.variables?.product.id === product.id;
              const ruta = rutaCategoria(product);

              return (
                <li key={product.id} className={`${FILA} border-b border-dashed border-kr-line last:border-b-0`}>
                  <div className="flex min-w-0 items-start gap-3 [grid-area:n] md:items-center">
                    <div className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-kr-line bg-kr-sand md:h-12 md:w-12 ${!product.isActive ? 'opacity-50' : ''}`}>
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-contain p-1" />
                      ) : (
                        <Package size={22} className="absolute inset-0 m-auto text-kr-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/productos/${product.id}/editar`}
                        className={`font-extrabold leading-snug hover:text-kr-blue ${product.isActive ? 'text-kr-navy' : 'text-kr-muted'}`}
                      >
                        {product.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-kr-muted">
                        {product.barcode ? <span className="tabular-nums">{product.barcode}</span> : <Chip tone="bad">Sin código</Chip>}
                        {ruta && <span className="xl:hidden">· {ruta}</span>}
                      </div>
                    </div>
                  </div>

                  <span className="hidden min-w-0 text-sm font-bold text-kr-muted [grid-area:k] xl:block">{ruta ?? '—'}</span>

                  <div className="flex min-w-0 flex-col gap-0.5 text-kr-muted [grid-area:c] md:items-end">
                    <span className="text-[11px] font-extrabold uppercase md:hidden">Costo</span>
                    <CeldaNumero
                      label={`Costo de ${product.title}`}
                      prefix="$"
                      value={product.cost ?? ''}
                      disabled={rowBusy}
                      onCommit={(raw) => {
                        const newCost = raw === '' ? null : parseFloat(raw);
                        if (newCost !== null && (isNaN(newCost) || newCost < 0)) return false;
                        if (newCost === costNum) return;
                        // mantiene el % de ganancia actual: si ya había costo y precio cargados,
                        // el precio se recalcula para no quedar desalineado con el costo nuevo
                        const newPrice = costNum && newCost !== null ? precioManteniendoMargen(costNum, priceNum, newCost) : undefined;
                        updateProductMutation.mutate({
                          product,
                          field: 'costo',
                          data: { cost: newCost, ...(newPrice !== undefined && { price: newPrice }) },
                        });
                      }}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-0.5 [grid-area:p] md:items-end">
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Precio</span>
                    <CeldaNumero
                      label={`Precio de ${product.title}`}
                      prefix="$"
                      value={product.price}
                      disabled={rowBusy}
                      onCommit={(raw) => {
                        const newPrice = parseFloat(raw);
                        if (isNaN(newPrice) || newPrice <= 0) return false;
                        if (newPrice === priceNum) return;
                        updateProductMutation.mutate({ product, field: 'precio', data: { price: newPrice } });
                      }}
                    />
                  </div>

                  <div className={`flex min-w-0 flex-col gap-0.5 [grid-area:g] md:items-end ${pct === null ? 'text-kr-muted' : pct >= 0 ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Ganancia</span>
                    {costNum ? (
                      <CeldaNumero
                        label={`Porcentaje de ganancia de ${product.title}`}
                        suffix="%"
                        step="0.1"
                        value={pct !== null ? pctValor(pct) : ''}
                        disabled={rowBusy}
                        onCommit={(raw) => {
                          const newPct = parseFloat(raw);
                          if (raw === '' || isNaN(newPct)) return false;
                          if (pct !== null && Math.abs(newPct - pct) < 0.05) return;
                          const newPrice = precioConGanancia(costNum, newPct);
                          if (newPrice <= 0) return false;
                          updateProductMutation.mutate({ product, field: 'ganancia', data: { price: newPrice } });
                        }}
                        className="max-w-[72px]"
                      />
                    ) : (
                      <span title="Cargá el costo para ver la ganancia" className="font-extrabold">—</span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col items-center gap-1 [grid-area:s]">
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Stock</span>
                    <ToggleSwitch
                      checked={product.isActive}
                      onChange={() => toggleMutation.mutate(product.id)}
                      label={`${product.title} con stock en la tienda`}
                    />
                  </div>

                  <MenuFila
                    open={menuId === product.id}
                    onToggle={() => setMenuId((id) => (id === product.id ? null : product.id))}
                    onClose={() => setMenuId(null)}
                    product={product}
                    onDelete={() => { setMenuId(null); setToDelete(product); setDeleteError(''); }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data && total > 0 && (
        <div className="flex items-center justify-end gap-2.5 text-sm font-extrabold text-kr-muted">
          <span className="tabular-nums">
            {desde.toLocaleString('es-AR')}–{hasta.toLocaleString('es-AR')} de {total.toLocaleString('es-AR')}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
            className={buttonClasses('secondary', 'md', 'w-11 !px-0')}
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.meta.totalPages}
            aria-label="Página siguiente"
            className={buttonClasses('secondary', 'md', 'w-11 !px-0')}
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          message={`¿Eliminar "${toDelete.title}"? Esta acción no se puede deshacer.`}
          loading={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => { setToDelete(null); setDeleteError(''); }}
        />
      )}
    </>
  );
}

function MenuFila({ open, onToggle, onClose, product, onDelete }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  product: Product;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // se cierra tocando afuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const item = 'min-h-10 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-extrabold hover:bg-kr-yellow-soft';

  return (
    <div ref={ref} className="relative justify-self-end self-start [grid-area:x] md:self-center">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Más acciones para ${product.title}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-kr-navy hover:bg-kr-sand"
      >
        <DotsThree size={24} weight="bold" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-30 flex min-w-[220px] flex-col rounded-xl border-2 border-kr-navy bg-white p-1 shadow-pop animate-fadeIn">
          <Link role="menuitem" href={`/productos/${product.id}/editar`} className={`${item} text-kr-navy`}>
            Editar
          </Link>
          <button role="menuitem" type="button" onClick={onDelete} className={`${item} text-kr-orange-dark`}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
