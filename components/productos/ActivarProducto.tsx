'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { products } from '@/lib/api';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { useToast } from '@/components/ui/Toast';

interface Props {
  productId: string;
  title: string;
  isActive: boolean;
  // para columnas angostas (tabla de factura manual): "Activar"/"Activo" en vez del texto largo
  compacto?: boolean;
  // para quien tiene una copia local del producto (ej. el modal de agregar a un pedido)
  onChanged?: (activo: boolean) => void;
}

// Mismo interruptor "Stock" que la lista de Productos (Product.isActive), para activar o
// desactivar un producto en el catálogo sin ir a buscarlo a Productos: desde una factura (llegó
// mercadería de algo inactivo) o desde un pedido (faltante descubierto al prepararlo). Se manda el valor explícito (no toggle-active) para que
// un doble click no lo deje como estaba.
export default function ActivarProducto({ productId, title, isActive, compacto = false, onChanged }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  // valor optimista mientras se guarda; null = mostrar lo que vino del server
  const [optimista, setOptimista] = useState<boolean | null>(null);
  const activo = optimista ?? isActive;

  const mutation = useMutation({
    mutationFn: (nuevo: boolean) => {
      const form = new FormData();
      form.append('isActive', String(nuevo));
      return products.update(productId, form);
    },
    onMutate: (nuevo) => setOptimista(nuevo),
    onSuccess: async (_p, nuevo) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['distribuidor'] }),
        qc.invalidateQueries({ queryKey: ['pedido'] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
      ]);
      setOptimista(null);
      onChanged?.(nuevo);
      toast.show(nuevo ? `${title}: activado en el catálogo` : `${title}: desactivado del catálogo`);
    },
    onError: (err: Error) => {
      setOptimista(null);
      toast.show(err.message ?? 'No se pudo cambiar el estado del producto', 'error');
    },
  });

  return (
    <div className="flex items-center gap-2">
      <ToggleSwitch
        checked={activo}
        loading={mutation.isPending}
        onChange={() => mutation.mutate(!activo)}
        label={`${title} activo en el catálogo`}
      />
      <span className={`text-xs font-extrabold whitespace-nowrap ${activo ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
        {compacto ? (activo ? 'Activo' : 'Activar') : activo ? 'Producto activo' : 'Activar producto'}
      </span>
    </div>
  );
}
