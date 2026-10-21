'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Warning } from '@phosphor-icons/react';
import { pedidos, PedidoItem, Product } from '@/lib/api';
import { money } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Field, { inputClasses } from '@/components/ui/Field';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export type ModoEdicion = 'cambiar' | 'cantidad' | 'quitar';

interface Props {
  pedidoId: string;
  item: PedidoItem;
  modo: ModoEdicion;
  onClose: () => void;
  onSaved: () => void;
}

// cambia un renglón de un pedido que todavía no salió: otro producto (el cliente eligió un reemplazo
// porque no había stock), otra cantidad, o lo quita. El server recalcula el total; la venta se arma
// recién al entregar, así que las métricas salen con lo que de verdad se mandó.
export default function EditarItemModal({ pedidoId, item, modo, onClose, onSaved }: Props) {
  const toast = useToast();
  const [paso, setPaso] = useState<'buscar' | 'datos'>(modo === 'cambiar' ? 'buscar' : 'datos');
  const [reemplazo, setReemplazo] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState(String(item.quantity));
  // lo normal es que se cambie o se quite porque no hay: por defecto ya queda sin stock en la tienda
  const [sinStock, setSinStock] = useState(true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      modo === 'quitar'
        ? pedidos.quitarItem(pedidoId, item.id, sinStock)
        : pedidos.modificarItem(pedidoId, item.id, {
            quantity: parseFloat(cantidad),
            ...(reemplazo && { productId: reemplazo.id, marcarSinStock: sinStock }),
          }),
    onSuccess: () => {
      toast.show(
        modo === 'quitar' ? `Se quitó "${item.name}" del pedido`
          : reemplazo ? `"${item.name}" cambiado por "${reemplazo.title}"`
          : 'Cantidad actualizada'
      );
      onSaved();
      onClose();
    },
    onError: (err: any) => setError(err.message ?? 'No se pudo guardar el cambio'),
  });

  if (paso === 'buscar') {
    return (
      <ProductSearchModal
        onSelect={(p) => { setReemplazo(p); setError(''); setPaso('datos'); }}
        onClose={onClose}
      />
    );
  }

  const cantidadNum = parseFloat(cantidad);
  const cantidadOk = modo === 'quitar' || cantidadNum > 0;
  const reemplazoSinStock = !!reemplazo && !reemplazo.isActive;
  const precio = reemplazo ? Number(reemplazo.price) : Number(item.unitPrice);
  const subtotal = cantidadOk ? precio * cantidadNum : 0;

  const titulo = modo === 'quitar' ? 'Quitar del pedido' : modo === 'cambiar' ? 'Cambiar producto' : 'Cambiar cantidad';
  const accion = modo === 'quitar' ? 'Quitar' : modo === 'cambiar' ? 'Cambiar' : 'Guardar';
  const guardar = () => { if (cantidadOk && !reemplazoSinStock && !mutation.isPending) mutation.mutate(); };

  return (
    <Modal
      title={titulo}
      size="sm"
      onClose={onClose}
      footer={
        <>
          {modo === 'cambiar' && (
            <button type="button" onClick={() => setPaso('buscar')} className={buttonClasses('secondary', 'md')}>
              Elegir otro
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={guardar}
            disabled={!cantidadOk || reemplazoSinStock || mutation.isPending}
            className={buttonClasses(modo === 'quitar' ? 'danger' : 'primary', 'md', 'flex-1 sm:flex-none')}
          >
            {mutation.isPending ? 'Guardando…' : accion}
          </button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        {reemplazo ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-extrabold leading-snug">
            <span className="text-kr-muted line-through">{item.name}</span>
            <ArrowRight size={16} weight="bold" className="flex-shrink-0" />
            <span>{reemplazo.title}</span>
          </div>
        ) : (
          <p className="font-extrabold leading-snug">{item.quantity}× {item.name}</p>
        )}

        {reemplazoSinStock && (
          <p className="flex items-start gap-2 rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">
            <Warning size={18} weight="fill" className="mt-0.5 flex-shrink-0" />
            Este producto también está sin stock en la tienda. Elegí otro.
          </p>
        )}

        {modo !== 'quitar' && (
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Cantidad" htmlFor="ei-cant">
              <input
                id="ei-cant"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                autoFocus
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={inputClasses('no-spin')}
              />
            </Field>
            <p className="pb-2.5 text-right text-sm font-bold text-kr-muted">
              {money(precio)} c/u
              <span className="block font-display text-xl leading-tight text-kr-navy tabular-nums">{money(subtotal)}</span>
            </p>
          </div>
        )}

        {modo !== 'cantidad' && item.productId && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-kr-line px-3 py-2.5">
            <ToggleSwitch checked={sinStock} onChange={() => setSinStock((v) => !v)} label={`Marcar "${item.name}" sin stock en la tienda`} />
            <span className="text-sm font-extrabold">
              Marcar &quot;{item.name}&quot; sin stock en la tienda
            </span>
          </label>
        )}

        {error && <p className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
      </form>
    </Modal>
  );
}
