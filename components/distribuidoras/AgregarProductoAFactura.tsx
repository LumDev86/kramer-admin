'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, facturas, Category, Product } from '@/lib/api';
import { MagnifyingGlass } from '@phosphor-icons/react';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import NuevoProductoManualForm from './NuevoProductoManualForm';

interface Props {
  facturaId: string;
  distribuidorId: string;
  categories: Category[];
  categoriesLoading: boolean;
  onAdded: () => void;
}

type Elegido = { id: string; title: string; cost: string | null };

// selector rápido de producto para armar una factura a mano (en vez de escanearla): elegir un
// producto (chip de "ya comprados", búsqueda, o crear uno nuevo) lo agrega directo como línea
// con valores por defecto - todo lo demás (cantidad, costo, precio, ganancia, código de
// artículo) se termina de ajustar en la fila misma (ver FacturaManualItemsTable), sin un paso
// intermedio de confirmación que solo agregaba un click de más
export default function AgregarProductoAFactura({ facturaId, distribuidorId, categories, categoriesLoading, onAdded }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [error, setError] = useState('');

  const { data: productosDistribuidora } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const addItemMutation = useMutation({
    mutationFn: (p: Elegido) =>
      facturas.addItem(facturaId, {
        productId: p.id,
        nombreDetectado: p.title,
        cantidad: 1,
        precioUnitario: p.cost ? Number(p.cost) : 0,
      }),
    onSuccess: () => { onAdded(); setError(''); },
    onError: (err: any) => setError(err.message ?? 'No se pudo agregar la línea'),
  });

  const selectProduct = (p: Elegido) => {
    setPickerOpen(false);
    addItemMutation.mutate(p);
  };

  return (
    <div className="flex flex-col gap-3">
      {productosDistribuidora && productosDistribuidora.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            Productos ya comprados a esta distribuidora
          </p>
          <div className="flex flex-wrap gap-1.5">
            {productosDistribuidora.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                disabled={addItemMutation.isPending}
                className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="relative w-5 h-5 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  <Image src={p.imageUrl} alt={p.title} fill sizes="20px" className="object-contain" />
                </div>
                <span className="truncate max-w-[140px]">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 self-start"
      >
        <MagnifyingGlass size={13} weight="bold" />
        Buscar otro producto o crear uno nuevo
      </button>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {pickerOpen && (
        <ProductSearchModal
          onSelect={(p: Product) => selectProduct(p)}
          onClose={() => setPickerOpen(false)}
          onCreateNew={() => { setPickerOpen(false); setCreatingNew(true); }}
        />
      )}

      {creatingNew && (
        <NuevoProductoManualForm
          categories={categories}
          categoriesLoading={categoriesLoading}
          onRegistrar={(product, cant, cst, codArt) =>
            facturas.addItem(facturaId, {
              productId: product.id,
              nombreDetectado: product.title,
              cantidad: cant,
              precioUnitario: cst,
              codigoArticulo: codArt,
            })
          }
          onCreated={() => { setCreatingNew(false); onAdded(); }}
          onCancel={() => setCreatingNew(false)}
        />
      )}
    </div>
  );
}
