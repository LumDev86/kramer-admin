'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { TrendUp } from '@phosphor-icons/react';
import { distribuidores, products, ProductoDistribuidor } from '@/lib/api';
import SearchInput from '@/components/ui/SearchInput';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import CeldaNumero from '@/components/productos/CeldaNumero';
import { gananciaPct, pctValor, precioConGanancia, precioManteniendoMargen } from '@/components/productos/precio';

interface Props {
  distribuidorId: string;
  onAplicarAumento: () => void;
}

// misma grilla que el listado de Productos (sin categoría): el nombre se queda con el ancho que sobra
const FILA =
  "grid items-center gap-x-2 gap-y-2.5 px-3 py-3 grid-cols-3 [grid-template-areas:'n_n_n'_'c_p_g'] " +
  "md:gap-x-3 md:px-4 md:py-2.5 md:grid-cols-[minmax(0,1fr)_104px_104px_84px] md:[grid-template-areas:'n_c_p_g']";

type CampoEditado = 'costo' | 'precio' | 'ganancia';
type FieldEdit = { product: ProductoDistribuidor; field: CampoEditado; data: { price?: number; cost?: number | null } };
const CAMPO_LABEL: Record<CampoEditado, string> = { costo: 'el costo', precio: 'el precio', ganancia: 'la ganancia' };

export default function ProductosDistribuidora({ distribuidorId, onAplicarAumento }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');

  const { data: productos, isLoading } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  // mismo patrón que la lista de Productos: Costo, Precio y Ganancia vinculados por
  // price = cost * (1 + pct/100), tocar cualquiera manda un único PUT parcial
  const updateFieldMutation = useMutation({
    mutationFn: ({ product, data }: FieldEdit) => {
      const form = new FormData();
      if (data.price !== undefined) form.append('price', String(data.price));
      if (data.cost !== undefined) form.append('cost', data.cost === null ? '' : String(data.cost));
      return products.update(product.id, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribuidor', distribuidorId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any, { product, field }) => {
      toast.show(`No se pudo guardar ${CAMPO_LABEL[field]} de "${product.title}": ${err.message ?? 'error'}`, 'error');
    },
  });

  const filtered = (productos ?? []).filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          label="Buscar producto de esta distribuidora"
          placeholder="Buscar producto de esta distribuidora"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" onClick={onAplicarAumento} className={buttonClasses('secondary', 'md')}>
          <TrendUp size={18} weight="bold" />
          Aplicar aumento
        </button>
      </div>

      <section aria-label="Productos de la distribuidora" className="rounded-2xl border border-kr-line bg-white">
        <div className={`${FILA} hidden md:grid rounded-t-2xl border-b border-kr-line bg-kr-paper text-xs font-extrabold uppercase tracking-wide text-kr-muted`}>
          <span className="[grid-area:n]">Producto</span>
          <span className="text-right [grid-area:c]">Costo</span>
          <span className="text-right [grid-area:p]">Precio</span>
          <span className="text-right [grid-area:g]">Ganancia</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-kr-sand" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-bold text-kr-muted">
            {productos && productos.length > 0
              ? 'Ningún producto coincide con la búsqueda.'
              : 'Todavía no confirmaste ninguna compra a esta distribuidora.'}
          </p>
        ) : (
          <ul>
            {filtered.map((p) => {
              const costNum = p.cost ? parseFloat(p.cost) : null;
              const priceNum = parseFloat(p.price);
              const pct = gananciaPct(costNum, priceNum);
              const rowBusy = updateFieldMutation.isPending && updateFieldMutation.variables?.product.id === p.id;

              return (
                <li key={p.id} className={`${FILA} border-b border-dashed border-kr-line last:border-b-0`}>
                  <div className="flex min-w-0 items-center gap-3 [grid-area:n]">
                    <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-kr-line bg-kr-sand md:h-11 md:w-11">
                      <Image src={p.imageUrl} alt="" fill sizes="44px" className="object-contain p-1" />
                    </span>
                    <Link href={`/productos/${p.id}/editar`} className="min-w-0 font-extrabold leading-snug hover:text-kr-blue">
                      {p.title}
                    </Link>
                  </div>

                  <div className="flex min-w-0 flex-col gap-0.5 text-kr-muted [grid-area:c] md:items-end">
                    <span className="text-[11px] font-extrabold uppercase md:hidden">Costo</span>
                    <CeldaNumero
                      label={`Costo de ${p.title}`}
                      prefix="$"
                      value={p.cost ?? ''}
                      disabled={rowBusy}
                      onCommit={(raw) => {
                        const newCost = raw === '' ? null : parseFloat(raw);
                        if (newCost !== null && (isNaN(newCost) || newCost < 0)) return false;
                        if (newCost === costNum) return;
                        // mantiene el % de ganancia actual: si ya había costo y precio,
                        // el precio nuevo se recalcula para conservar ese mismo margen
                        const newPrice = costNum && newCost !== null ? precioManteniendoMargen(costNum, priceNum, newCost) : undefined;
                        updateFieldMutation.mutate({
                          product: p,
                          field: 'costo',
                          data: { cost: newCost, ...(newPrice !== undefined && { price: newPrice }) },
                        });
                      }}
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-0.5 [grid-area:p] md:items-end">
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Precio</span>
                    <CeldaNumero
                      label={`Precio de ${p.title}`}
                      prefix="$"
                      value={p.price}
                      disabled={rowBusy}
                      onCommit={(raw) => {
                        const newPrice = parseFloat(raw);
                        if (isNaN(newPrice) || newPrice <= 0) return false;
                        if (newPrice === priceNum) return;
                        updateFieldMutation.mutate({ product: p, field: 'precio', data: { price: newPrice } });
                      }}
                    />
                  </div>

                  <div className={`flex min-w-0 flex-col gap-0.5 [grid-area:g] md:items-end ${pct === null ? 'text-kr-muted' : pct >= 0 ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
                    <span className="text-[11px] font-extrabold uppercase text-kr-muted md:hidden">Ganancia</span>
                    {costNum ? (
                      <CeldaNumero
                        label={`Porcentaje de ganancia de ${p.title}`}
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
                          updateFieldMutation.mutate({ product: p, field: 'ganancia', data: { price: newPrice } });
                        }}
                      />
                    ) : (
                      <span title="Cargá el costo para ver la ganancia" className="font-extrabold">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
