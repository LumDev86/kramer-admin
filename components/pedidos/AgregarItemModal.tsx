'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Warning } from '@phosphor-icons/react';
import { pedidos, PedidoItem, Product } from '@/lib/api';
import { money } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Field, { inputClasses } from '@/components/ui/Field';
import ProductSearchModal from '@/components/ui/ProductSearchModal';
import { buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import ActivarProducto from '@/components/productos/ActivarProducto';

interface Props {
  pedidoId: string;
  // renglones actuales, para avisar antes de mandar si el producto ya está en el pedido
  items: PedidoItem[];
  onClose: () => void;
  onSaved: () => void;
}

// suma un producto del catálogo a un pedido que todavía no salió (el cliente pidió algo más, o
// se le ofreció algo además de lo que pidió). Entra a su precio vigente y el server recalcula el
// total; mismas reglas que EditarItemModal (solo activos, sin repetir un producto del pedido).
export default function AgregarItemModal({ pedidoId, items, onClose, onSaved }: Props) {
  const toast = useToast();
  const [producto, setProducto] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => pedidos.agregarItem(pedidoId, { productId: producto!.id, quantity: parseFloat(cantidad) }),
    onSuccess: () => {
      toast.show(`Se agregó "${producto!.title}" al pedido`);
      onSaved();
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? 'No se pudo agregar el producto'),
  });

  if (!producto) {
    return (
      <ProductSearchModal
        onSelect={(p) => { setProducto(p); setError(''); }}
        onClose={onClose}
      />
    );
  }

  const cantidadNum = parseFloat(cantidad);
  const cantidadOk = cantidadNum > 0;
  const inactivo = !producto.isActive;
  const yaEsta = items.some((i) => i.productId === producto.id);
  const bloqueado = !cantidadOk || inactivo || yaEsta || mutation.isPending;
  const precio = Number(producto.price);
  const guardar = () => { if (!bloqueado) mutation.mutate(); };

  return (
    <Modal
      title="Agregar producto"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={() => setProducto(null)} className={buttonClasses('secondary', 'md')}>
            Elegir otro
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={guardar}
            disabled={bloqueado}
            className={buttonClasses('primary', 'md', 'flex-1 sm:flex-none')}
          >
            {mutation.isPending ? 'Agregando…' : 'Agregar'}
          </button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <p className="font-extrabold leading-snug">{producto.title}</p>

        {yaEsta ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">
            <Warning size={18} weight="fill" className="mt-0.5 flex-shrink-0" />
            Este producto ya está en el pedido: cambiale la cantidad a ese renglón.
          </p>
        ) : inactivo && (
          <div className="flex flex-col gap-2 rounded-xl bg-[#FFE7D6] px-3 py-2">
            <p className="flex items-start gap-2 text-sm font-bold text-kr-orange-dark">
              <Warning size={18} weight="fill" className="mt-0.5 flex-shrink-0" />
              Este producto está inactivo en el catálogo. Si lo tenés, activalo para poder agregarlo.
            </p>
            <ActivarProducto
              productId={producto.id}
              title={producto.title}
              isActive={producto.isActive}
              onChanged={(activo) => setProducto((p) => p && { ...p, isActive: activo })}
            />
          </div>
        )}

        <div className="grid grid-cols-2 items-end gap-3">
          <Field label="Cantidad" htmlFor="ai-cant">
            <input
              id="ai-cant"
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
            <span className="block font-display text-xl leading-tight text-kr-navy tabular-nums">
              {money(cantidadOk ? precio * cantidadNum : 0)}
            </span>
          </p>
        </div>

        {error && <p className="rounded-lg bg-[#FFE7D6] px-3 py-2 text-sm font-bold text-kr-orange-dark">{error}</p>}
      </form>
    </Modal>
  );
}
