'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { removePushSubscription } from '@/lib/push';
import Sidebar from '@/components/layout/Sidebar';
import PedidoNuevoAlerta from '@/components/pedidos/PedidoNuevoAlerta';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    auth.me()
      .then(() => setChecking(false))
      .catch(() => {
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // el aviso de "pedido nuevo" es solo el modal + sonido de PedidoNuevoAlerta - se limpia el
  // Web Push que haya quedado registrado de antes para que no aparezca más la notificación
  // nativa de Windows (ver lib/push.ts)
  useEffect(() => {
    removePushSubscription();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-60 flex-1 p-4 pt-20 sm:p-6 md:p-8 md:pt-8 animate-fadeIn min-w-0 print:ml-0 print:p-0">
        {children}
      </main>
      <PedidoNuevoAlerta />
    </div>
  );
}
