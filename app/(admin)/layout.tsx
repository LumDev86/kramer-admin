'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { unlockAudio, stopAlarm, requestNotificationPermission } from '@/lib/notificationSound';
import Sidebar from '@/components/layout/Sidebar';

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

  // el sonido de "pedido nuevo" necesita un gesto real del usuario para no quedar bloqueado
  // por la política de autoplay del navegador - el login ya cuenta, pero si la sesión venía
  // guardada (pestaña reabierta sin loguearse de nuevo) puede no haber habido ningún click
  // todavía, así que lo destrabamos con el primer click/touch de la sesión, sin pedir nada visible.
  // Aprovechamos ese mismo primer click para pedir permiso de notificaciones de escritorio
  // (son las que avisan aunque el navegador no tenga el foco).
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      requestNotificationPermission();
    };
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, []);

  // la alarma de "pedido nuevo" suena en loop hasta que el dueño la atiende: cualquier click
  // en el panel, o simplemente volver a esta pestaña, la apaga (además del tope de seguridad
  // de 2 minutos que ya tiene startAlarm por si nadie está mirando).
  useEffect(() => {
    const handleInteraction = () => stopAlarm();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') stopAlarm();
    };
    window.addEventListener('pointerdown', handleInteraction);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
    </div>
  );
}
