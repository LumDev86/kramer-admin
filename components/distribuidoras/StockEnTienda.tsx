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
}

// Mismo interruptor "Stock" que la lista de Productos (Product.isActive), para que al cargar
// una factura se pueda activar en el catálogo un producto que estaba inactivo sin tener que
// ir a buscarlo a Productos. Se manda el valor explícito (no toggle-active) para que
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
