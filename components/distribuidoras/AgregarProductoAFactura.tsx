'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, facturas, Category, Product } from '@/lib/api';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import NuevoProductoManualForm from './NuevoProductoManualForm';

interface Props {
  facturaId: string;
  distribuidorId: string;
  categories: Category[];
  categoriesLoading: boolean;
  onAdded: () => void;
}

type Elegido = { id: string; title: string; cost: string | null; imageUrl: string };

// selector rápido de producto para armar una factura a mano (en vez de escanearla): primero
// ofrece los productos que ya se le compraron antes a esta distribuidora (un click), después
// buscar cualquier otro producto del catálogo, y si no existe, crearlo ahí mismo
export default function AgregarProductoAFactura({ facturaId, distribuidorId, categories, categoriesLoading, onAdded }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [selected, setSelected] = useState<Elegido | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('');
  const [error, setError] = useState('');

  const { data: productosDistribuidora } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      facturas.addItem(facturaId, {
        productId: selected!.id,
        nombreDetectado: selected!.title,
        cantidad: parseFloat(cantidad || '1'),
        precioUnitario: parseFloat(costo),
      }),
    onSuccess: () => {
      onAdded();
      setSelected(null);
      setCosto('');
      setCantidad('1');
      setError('');
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo agregar la línea'),
  });

  const selectProduct = (p: Elegido) => {
    setSelected(p);
    setCosto(p.cost ?? '');
    setCantidad('1');
    setError('');
    setPickerOpen(false);
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
                className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  selected?.id === p.id
                    ? 'border-orange-400 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
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

      {selected && (
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl p-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <div className="relative w-8 h-8 flex-shrink-0 bg-white rounded-lg overflow-hidden">
              <Image src={selected.imageUrl} alt={selected.title} fill sizes="32px" className="object-contain p-0.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700 truncate">{selected.title}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cant.</label>
            <input
              type="number"
              step="1"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Costo</label>
            <input
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <button
            onClick={() => setSelected(null)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X size={14} weight="bold" />
          </button>
          <button
            onClick={() => addItemMutation.mutate()}
            disabled={!costo || addItemMutation.isPending}
            className="py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-50"
          >
            {addItemMutation.isPending ? 'Agregando...' : 'Agregar línea'}
          </button>
        </div>
      )}
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
          onRegistrar={(product, cant, cst) =>
            facturas.addItem(facturaId, {
              productId: product.id,
              nombreDetectado: product.title,
              cantidad: cant,
              precioUnitario: cst,
            })
          }
          onCreated={() => { setCreatingNew(false); onAdded(); }}
          onCancel={() => setCreatingNew(false)}
        />
      )}
    </div>
  );
}
