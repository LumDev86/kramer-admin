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
        <div className="w-8 h-8 border-4 border-kr-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* el margen izquierdo acompaña al menú: columna de íconos en tablet, lateral completo
          desde lg; en celular el menú va arriba (60px) y abajo (64px) */}
      <main className="md:ml-[72px] lg:ml-60 flex-1 flex flex-col gap-4 sm:gap-5 px-4 pt-[76px] pb-24 sm:px-6 md:px-8 md:pt-7 md:pb-8 animate-fadeIn min-w-0 print:ml-0 print:p-0">
        {children}
      </main>
      <PedidoNuevoAlerta />
    </div>
  );
}
