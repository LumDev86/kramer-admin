'use client';

import { Fragment, useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { FacturaItem, Category, SuggestedProduct } from '@/lib/api';
import ProductoVinculado from './ProductoVinculado';
import VincularProductoPanel from './VincularProductoPanel';
import NuevoProductoDesdeFacturaForm from './NuevoProductoDesdeFacturaForm';

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
  onProductCreated,
}: Props) {
  const [creando, setCreando] = useState(false);

  return (
    <Fragment>
      <tr className="align-top animate-slideUp">
        <td className="px-4 py-3">
          <input
            defaultValue={item.nombreDetectado}
            onBlur={(e) => e.target.value !== item.nombreDetectado && onUpdate({ nombreDetectado: e.target.value })}
            className="w-full text-sm font-semibold text-gray-700 outline-none border-b border-transparent focus:border-orange-300"
          />
          {item.unidadesPorBultoDetectada != null && (
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              📦 Detectado por bulto de {item.unidadesPorBultoDetectada} un. · cant./precio ya normalizados por unidad
            </p>
          )}
          {item.alicuotaIvaDetectada != null && (
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              🧾 IVA {item.alicuotaIvaDetectada}% ya incluido en el costo
            </p>
          )}
          {item.codigoArticuloDetectado && (
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              🏷️ Cód. artículo de esta distribuidora: {item.codigoArticuloDetectado}
              {item.productId && ' · guardado para reconocerlo solo la próxima vez'}
            </p>
          )}
          {item.product ? (
            <ProductoVinculado
              item={item as FacturaItem & { product: NonNullable<FacturaItem['product']> }}
              onDesvincular={() => onUpdate({ productId: null })}
              onActualizarPrecio={(price) => onActualizarPrecioProducto(item.product!.id, price)}
              actualizandoPrecio={actualizandoPrecio}
              error={errorActualizarPrecio}
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
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            step="1"
            defaultValue={item.cantidad}
            onBlur={(e) => {
              const cantidad = Math.round(parseFloat(e.target.value));
              if (!isNaN(cantidad) && cantidad !== item.cantidad) onUpdate({ cantidad });
            }}
            className="w-16 text-sm font-semibold outline-none border-b border-transparent focus:border-orange-300"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            step="0.01"
            defaultValue={item.precioUnitario}
            onBlur={(e) =>
              parseFloat(e.target.value) !== Number(item.precioUnitario) &&
              onUpdate({ precioUnitario: parseFloat(e.target.value) })
            }
            className="w-20 text-sm font-semibold outline-none border-b border-transparent focus:border-orange-300"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            step="0.01"
            defaultValue={item.subtotal}
            onBlur={(e) => {
              const newSubtotal = parseFloat(e.target.value);
              if (isNaN(newSubtotal) || newSubtotal === Number(item.subtotal)) return;
              if (!(item.cantidad > 0)) return;
              onUpdate({ precioUnitario: newSubtotal / item.cantidad });
            }}
            className="w-20 font-bold text-orange-500 outline-none border-b border-transparent focus:border-orange-300"
          />
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash size={14} weight="bold" />
          </button>
        </td>
      </tr>
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
    </Fragment>
  );
}
