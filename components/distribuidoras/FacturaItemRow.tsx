'use client';

import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { FacturaItem, Category, SuggestedProduct } from '@/lib/api';
import ProductoVinculado from './ProductoVinculado';
import VincularProductoPanel from './VincularProductoPanel';
import NuevoProductoDesdeFacturaForm from './NuevoProductoDesdeFacturaForm';
import { celdaInput, celdaLabel } from './estilos';

type ProductoBase = { id: string; title: string; price: string };

interface Props {
  item: FacturaItem;
  facturaId: string;
  suggestions: SuggestedProduct[];
  categories: Category[];
  categoriesLoading: boolean;
  onUpdate: (data: { productId?: string | null; nombreDetectado?: string; cantidad?: number; precioUnitario?: number }) => void;
  onRemove: () => void;
  onVincular: (product: ProductoBase, precio: string) => void;
  onActualizarPrecioProducto: (productId: string, price: number) => void;
  actualizandoPrecio: boolean;
  errorActualizarPrecio?: string;
  precioActualizado?: number;
  onProductCreated: () => void;
}

export default function FacturaItemRow({
  item,
  facturaId,
  suggestions,
  categories,
  categoriesLoading,
  onUpdate,
  onRemove,
  onVincular,
  onActualizarPrecioProducto,
  actualizandoPrecio,
  errorActualizarPrecio,
  precioActualizado,
  onProductCreated,
}: Props) {
  const [creando, setCreando] = useState(false);

  return (
    <li className="border-b border-dashed border-kr-line last:border-b-0 animate-slideUp">
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_44px] items-start gap-x-2 gap-y-2.5 px-3 py-3 md:grid-cols-[minmax(0,1fr)_76px_112px_120px_44px] md:gap-x-3 md:px-4">
        <div className="col-span-3 flex min-w-0 flex-col gap-1 md:col-span-1">
          <input
            defaultValue={item.nombreDetectado}
            aria-label="Nombre leído en la factura"
            onBlur={(e) => e.target.value !== item.nombreDetectado && onUpdate({ nombreDetectado: e.target.value })}
            className="w-full min-w-0 border-b-[1.5px] border-dashed border-[#B9AE97] bg-transparent py-1 text-[15px] font-extrabold text-kr-navy outline-none focus:border-solid focus:border-kr-blue"
          />
          {item.unidadesPorBultoDetectada != null && (
            <p className="text-xs font-bold text-kr-muted">
              Leído por bulto de {item.unidadesPorBultoDetectada} un. · cantidad y costo ya pasados a unidad
            </p>
          )}
          {item.alicuotaIvaDetectada != null && (
            <p className="text-xs font-bold text-kr-muted">IVA {item.alicuotaIvaDetectada}% ya sumado al costo</p>
          )}
          {item.codigoArticuloDetectado && (
            <p className="text-xs font-bold text-kr-muted">
              Cód. art. <span className="tabular-nums text-kr-navy">{item.codigoArticuloDetectado}</span>
              {item.productId && ' · se guarda para reconocerlo solo la próxima vez'}
            </p>
          )}
          {item.product ? (
            <ProductoVinculado
              item={item as FacturaItem & { product: NonNullable<FacturaItem['product']> }}
              onDesvincular={() => onUpdate({ productId: null })}
              onActualizarPrecio={(price) => onActualizarPrecioProducto(item.product!.id, price)}
              actualizandoPrecio={actualizandoPrecio}
              error={errorActualizarPrecio}
              precioActualizado={precioActualizado}
            />
          ) : (
            <VincularProductoPanel
              item={item}
              suggestions={suggestions}
              mostrandoFormCreacion={creando}
              onVincular={onVincular}
              actualizandoPrecio={actualizandoPrecio}
              onCrearNuevo={() => setCreando(true)}
            />
          )}
        </div>

        <div className="col-start-4 row-start-1 flex justify-end md:col-start-5">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${item.nombreDetectado}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-kr-muted hover:bg-[#FFE7D6] hover:text-kr-orange-dark"
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>

        <label className="flex min-w-0 flex-col gap-1 md:col-start-2 md:row-start-1">
          <span className={`${celdaLabel} md:hidden`}>Cant.</span>
          <input
            key={item.cantidad}
            type="number"
            inputMode="numeric"
            step="1"
            defaultValue={item.cantidad}
            aria-label="Cantidad"
            onBlur={(e) => {
              const cantidad = Math.round(parseFloat(e.target.value));
              if (!isNaN(cantidad) && cantidad !== item.cantidad) onUpdate({ cantidad });
            }}
            className={`${celdaInput} md:text-right`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 md:col-start-3 md:row-start-1">
          <span className={`${celdaLabel} md:hidden`}>Costo</span>
          <input
            key={item.precioUnitario}
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={item.precioUnitario}
            aria-label="Costo por unidad"
            onBlur={(e) =>
              parseFloat(e.target.value) !== Number(item.precioUnitario) &&
              onUpdate({ precioUnitario: parseFloat(e.target.value) })
            }
            className={`${celdaInput} md:text-right`}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 md:col-start-4 md:row-start-1">
          <span className={`${celdaLabel} md:hidden`}>Subtotal</span>
          <input
            key={item.subtotal}
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={item.subtotal}
            aria-label="Subtotal"
            onBlur={(e) => {
              const newSubtotal = parseFloat(e.target.value);
              if (isNaN(newSubtotal) || newSubtotal === Number(item.subtotal)) return;
              if (!(item.cantidad > 0)) return;
              onUpdate({ precioUnitario: newSubtotal / item.cantidad });
            }}
            className={`${celdaInput} md:text-right`}
          />
        </label>
      </div>
      {creando && (
        <NuevoProductoDesdeFacturaForm
          item={item}
          facturaId={facturaId}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onCreated={() => { setCreando(false); onProductCreated(); }}
          onCancel={() => setCreando(false)}
        />
      )}
    </li>
  );
}
