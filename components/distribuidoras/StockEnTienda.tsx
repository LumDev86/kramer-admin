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
  // para columnas angostas (tabla de factura manual): "Con stock" en vez de "Con stock en la tienda"
  compacto?: boolean;
}

// Mismo interruptor "Stock" que la lista de Productos (Product.isActive), para que al cargar
// una factura se pueda volver a habilitar en la tienda un producto que estaba sin stock sin
// tener que ir a buscarlo a Productos. Se manda el valor explícito (no toggle-active) para que
// un doble click no lo deje como estaba.
export default function StockEnTienda({ productId, title, isActive, compacto = false }: Props) {
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
        qc.invalidateQueries({ queryKey: ['products'] }),
      ]);
      setOptimista(null);
      toast.show(nuevo ? `${title}: con stock en la tienda` : `${title}: sin stock en la tienda`);
    },
    onError: (err: Error) => {
      setOptimista(null);
      toast.show(err.message ?? 'No se pudo cambiar el stock del producto', 'error');
    },
  });

  return (
    <div className="flex items-center gap-2">
      <ToggleSwitch
        checked={activo}
        loading={mutation.isPending}
        onChange={() => mutation.mutate(!activo)}
        label={`${title} con stock en la tienda`}
      />
      <span className={`text-xs font-extrabold whitespace-nowrap ${activo ? 'text-kr-green-dark' : 'text-kr-orange-dark'}`}>
        {activo ? 'Con stock' : 'Sin stock'}{!compacto && ' en la tienda'}
      </span>
    </div>
  );
}
