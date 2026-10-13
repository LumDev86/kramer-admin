'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { distribuidores, facturas, products, Category, Product } from '@/lib/api';
import { Barcode, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { buttonClasses } from '@/components/ui/Button';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import NuevoProductoManualForm from './NuevoProductoManualForm';
import { useF10 } from '@/lib/useF10';

interface Props {
  facturaId: string;
  distribuidorId: string;
  categories: Category[];
  categoriesLoading: boolean;
  onAdded: () => void;
}

const ATAJOS = 12;

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
  const [codigo, setCodigo] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  // con muchas compras la lista de atajos tapaba la factura: se muestran unos pocos y el resto a pedido
  const [verTodos, setVerTodos] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);

  // F10 abre/cierra el buscador, igual que en Ventas
  useF10(() => setPickerOpen((o) => !o));

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
    // vuelve al campo del código para seguir escaneando sin tocar el mouse
    onSuccess: () => { onAdded(); setError(''); codigoRef.current?.focus(); },
    onError: (err: any) => setError(err.message ?? 'No se pudo agregar la línea'),
  });

  const selectProduct = (p: Elegido) => {
    setPickerOpen(false);
    addItemMutation.mutate(p);
  };

  // el lector de códigos tipea el código y manda Enter: si existe, se agrega directo
  const agregarPorCodigo = async () => {
    const code = codigo.trim();
    if (!code) { setPickerOpen(true); return; }
    setBuscandoCodigo(true);
    const p = await products.getByBarcode(code);
    setBuscandoCodigo(false);
    if (!p) {
      setError(`No hay ningún producto con el código ${code}. Buscalo por nombre o crealo como producto nuevo.`);
      return;
    }
    setCodigo('');
    selectProduct(p);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-12 min-w-0 flex-1 basis-72 items-center gap-2.5 rounded-xl border-2 border-dashed border-kr-blue bg-white px-3 focus-within:border-solid">
          <Barcode size={22} weight="bold" className="flex-shrink-0 text-kr-blue" />
          <input
            ref={codigoRef}
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarPorCodigo(); } }}
            disabled={buscandoCodigo || addItemMutation.isPending}
            aria-label="Agregar producto por código de barras"
            placeholder="Agregar: escaneá el código o tocá Buscar"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-kr-navy outline-none placeholder:text-kr-muted"
          />
        </label>
        <button type="button" onClick={() => setPickerOpen(true)} className={buttonClasses('secondary', 'md')}>
          <MagnifyingGlass size={18} weight="bold" />
          Buscar
          <kbd className="rounded border border-kr-line bg-kr-paper px-1 text-[11px] font-extrabold text-kr-muted">F10</kbd>
        </button>
        <button type="button" onClick={() => setCreatingNew(true)} className={buttonClasses('secondary', 'md', '!border-kr-blue !text-kr-blue')}>
          <Plus size={18} weight="bold" />
          Producto nuevo
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}

      {productosDistribuidora && productosDistribuidora.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-kr-muted">Ya le compraste a esta distribuidora</p>
          {/* celular: una sola fila que se desliza de costado, para no tapar la factura */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {(verTodos ? productosDistribuidora : productosDistribuidora.slice(0, ATAJOS)).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProduct(p)}
                disabled={addItemMutation.isPending}
                className="flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-kr-line bg-white py-1 pl-1 pr-2.5 text-left text-[13px] font-bold text-kr-navy hover:border-kr-navy/40 disabled:opacity-50"
              >
                <span className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-md bg-kr-sand">
                  <Image src={p.imageUrl} alt="" fill sizes="28px" className="object-contain" />
                </span>
                <Plus size={12} weight="bold" className="flex-shrink-0 text-kr-muted" />
                {p.title}
              </button>
            ))}
            {productosDistribuidora.length > ATAJOS && (
              <button
                type="button"
                onClick={() => setVerTodos((v) => !v)}
                className="min-h-9 flex-shrink-0 whitespace-nowrap rounded-[10px] px-2.5 text-[13px] font-extrabold text-kr-blue hover:bg-kr-blue-soft"
              >
                {verTodos ? 'Ver menos' : `Ver los ${productosDistribuidora.length}`}
              </button>
            )}
          </div>
        </div>
      )}

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
