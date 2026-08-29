'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, facturas, products, Category, Product } from '@/lib/api';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { money } from '@/lib/format';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import NuevoProductoManualForm from './NuevoProductoManualForm';

interface Props {
  facturaId: string;
  distribuidorId: string;
  categories: Category[];
  categoriesLoading: boolean;
  onAdded: () => void;
}

type Elegido = { id: string; title: string; cost: string | null; price: string; imageUrl: string };

// selector rápido de producto para armar una factura a mano (en vez de escanearla): primero
// ofrece los productos que ya se le compraron antes a esta distribuidora (un click), después
// buscar cualquier otro producto del catálogo, y si no existe, crearlo ahí mismo
export default function AgregarProductoAFactura({ facturaId, distribuidorId, categories, categoriesLoading, onAdded }: Props) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [selected, setSelected] = useState<Elegido | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [costo, setCosto] = useState('');
  const [precio, setPrecio] = useState('');
  const [gananciaPct, setGananciaPct] = useState('');
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [error, setError] = useState('');

  const { data: productosDistribuidora } = useQuery({
    queryKey: ['distribuidor', distribuidorId, 'productos'],
    queryFn: () => distribuidores.getProductos(distribuidorId),
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const costoNum = parseFloat(costo);
      const precioNum = parseFloat(precio);
      const factura = await facturas.addItem(facturaId, {
        productId: selected!.id,
        nombreDetectado: selected!.title,
        cantidad: parseFloat(cantidad || '1'),
        precioUnitario: costoNum,
        codigoArticulo: codigoArticulo.trim() || undefined,
      });
      // el "confirmar factura" solo actualiza costo y stock - si además cambiaste el precio
      // de venta acá, hay que guardarlo aparte (misma lógica que al vincular un ítem escaneado)
      if (!isNaN(precioNum) && precioNum > 0 && precioNum !== Number(selected!.price)) {
        const form = new FormData();
        form.append('price', String(precioNum));
        await products.update(selected!.id, form);
        qc.invalidateQueries({ queryKey: ['products'] });
      }
      return factura;
    },
    onSuccess: () => {
      onAdded();
      setSelected(null);
      setCosto('');
      setPrecio('');
      setGananciaPct('');
      setCodigoArticulo('');
      setCantidad('1');
      setError('');
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo agregar la línea'),
  });

  const selectProduct = (p: Elegido) => {
    setSelected(p);
    setCosto(p.cost ?? '');
    setPrecio(p.price);
    setGananciaPct('');
    setCodigoArticulo('');
    setCantidad('1');
    setError('');
    setPickerOpen(false);
  };

  const costoNum = parseFloat(costo || '0') || 0;
  const cantidadNum = parseFloat(cantidad || '0') || 0;
  const precioNum = parseFloat(precio || '0') || 0;
  const pct = costoNum > 0 && precio !== '' ? ((precioNum - costoNum) / costoNum) * 100 : null;
  const subtotal = costoNum * cantidadNum;

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
        <div className="flex flex-col gap-2.5 bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex-shrink-0 bg-white rounded-lg overflow-hidden">
              <Image src={selected.imageUrl} alt={selected.title} fill sizes="32px" className="object-contain p-0.5" />
            </div>
            <p className="text-sm font-semibold text-gray-700 flex-1 truncate">{selected.title}</p>
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
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
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Costo (mayor)</label>
              <input
                type="number"
                step="0.01"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Precio (lista)</label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ganancia</label>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  step="0.1"
                  value={gananciaPct !== '' ? gananciaPct : pct !== null ? pct.toFixed(1) : ''}
                  disabled={!costoNum}
                  onChange={(e) => {
                    setGananciaPct(e.target.value);
                    const newPct = parseFloat(e.target.value);
                    if (isNaN(newPct) || !costoNum) return;
                    setPrecio((costoNum * (1 + newPct / 100)).toFixed(2));
                  }}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-400 disabled:opacity-50"
                />
                <span className="text-xs font-bold text-gray-400">%</span>
              </div>
            </div>
            <button
              onClick={() => addItemMutation.mutate()}
              disabled={!costo || addItemMutation.isPending}
              className="py-2 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {addItemMutation.isPending ? 'Agregando...' : 'Agregar línea'}
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={codigoArticulo}
              onChange={(e) => setCodigoArticulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Código de artículo de esta distribuidora (opcional)"
              className="flex-1 min-w-[220px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-orange-400"
            />
            {costoNum > 0 && (
              <p className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                Subtotal: {money(subtotal)}
              </p>
            )}
          </div>
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
