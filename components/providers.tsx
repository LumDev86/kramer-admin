'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';

const MINUTO = 60_000;

function crearQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

  // Solo se cambian desde el panel y cada alta/edición/baja ya invalida su key, así que se pueden
  // reusar más tiempo sin mostrar datos viejos. Productos, ventas, caja, clientes y pedidos quedan
  // con el plazo corto: los modifican la caja, la tienda y el delivery, no solo estas pantallas.
  queryClient.setQueryDefaults(['categories'],     { staleTime: 10 * MINUTO });
  queryClient.setQueryDefaults(['categories-all'], { staleTime: 10 * MINUTO });
  queryClient.setQueryDefaults(['category'],       { staleTime: 10 * MINUTO });
  queryClient.setQueryDefaults(['banners'],        { staleTime: 10 * MINUTO });
  queryClient.setQueryDefaults(['banner'],         { staleTime: 10 * MINUTO });

  return queryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(crearQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
