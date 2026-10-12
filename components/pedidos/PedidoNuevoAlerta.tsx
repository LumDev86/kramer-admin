'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell } from '@phosphor-icons/react';
import { pedidos, Pedido } from '@/lib/api';
import { money, PAYMENT_LABEL } from '@/lib/format';
import { buttonClasses } from '@/components/ui/Button';

// más rápido que el refetchInterval de la pantalla de Pedidos (15000) - el aviso sonoro tiene
// que notarse apenas entra el pedido, no en cualquier momento dentro de una ventana de 15s
const POLL_INTERVAL_MS = 8000;

// Montado una sola vez en el layout del admin (no en la pantalla de Pedidos) para que la alerta
// suene y el modal aparezca sin importar qué sección del panel se esté mirando. Reemplaza al
// push del sistema operativo como forma principal de aviso: acá se elige el sonido y se
// muestran los datos completos del pedido en vez de depender de una notificación nativa.
// Es el ÚNICO aviso de pedido nuevo (el Web Push con notificación nativa de Windows se sacó a
// pedido del dueño). Suena también con la pestaña en segundo plano (ver
// refetchIntervalInBackground más abajo), siempre que haya habido al menos un click en el
// panel en esta sesión - sin ese gesto el navegador bloquea el audio.
export default function PedidoNuevoAlerta() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  // null = todavía no se hizo el primer fetch de la sesión - se usa para no alertar
  // retroactivamente pedidos NUEVOS que ya existían antes de abrir el panel
  const vistosRef = useRef<Set<string> | null>(null);
  const [cola, setCola] = useState<Pedido[]>([]);

  const { data } = useQuery({
    queryKey: ['pedidos-nuevo-watch'],
    queryFn: () => pedidos.getAll('NUEVO'),
    refetchInterval: POLL_INTERVAL_MS,
    // React Query por defecto CORTA el polling cuando la pestaña queda oculta (otra pestaña
    // activa, ventana minimizada o tapada por completo) - ese era el motivo real de que la
    // alarma no sonara fuera del panel: nadie se enteraba del pedido hasta volver a la
    // pestaña. El audio en sí sí puede sonar en segundo plano una vez desbloqueado por el
    // primer click (ver más abajo). Chrome igual puede espaciar este timer hasta ~1 min si la
    // pestaña lleva >5 min oculta, así que en ese caso el aviso puede demorar hasta ~1 min.
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!data) return;
    if (vistosRef.current === null) {
      vistosRef.current = new Set(data.map((p) => p.id));
      return;
    }
    const nuevos = data.filter((p) => !vistosRef.current!.has(p.id));
    if (nuevos.length === 0) return;
    nuevos.forEach((p) => vistosRef.current!.add(p.id));
    setCola((prev) => [...prev, ...nuevos]);
  }, [data]);

  // los navegadores bloquean el audio con sonido si nunca hubo un gesto del usuario en esta
  // pestaña - se "prima" el elemento (play + pause inmediato) en el primer click/touch de la
  // sesión para que el .play() de más abajo, disparado solo por datos del polling, no falle
  useEffect(() => {
    const desbloquear = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(() => audio.pause()).catch(() => {});
    };
    window.addEventListener('pointerdown', desbloquear, { once: true });
    return () => window.removeEventListener('pointerdown', desbloquear);
  }, []);

  const pedidoActual = cola[0] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (pedidoActual) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [pedidoActual]);

  const cerrar = () => setCola((prev) => prev.slice(1));
  const verPedido = () => {
    if (!pedidoActual) return;
    router.push(`/pedidos/${pedidoActual.id}`);
    cerrar();
  };

  return (
    <>
      <audio ref={audioRef} src="/sounds/pedido-nuevo.mp3" loop preload="auto" />

      {pedidoActual && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-kr-navy/60 px-4 animate-fadeIn">
          <div role="alertdialog" aria-modal="true" aria-label="Pedido nuevo" className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-kr-navy bg-white shadow-pop-lg animate-slideUp">
            <div className="flex items-center gap-3 border-b-2 border-kr-navy bg-kr-yellow px-5 py-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-kr-navy bg-white">
                <Bell size={22} weight="fill" className="text-kr-orange-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-none">¡Pedido nuevo!</p>
                <p className="text-sm font-extrabold">{pedidoActual.numero}</p>
              </div>
              {cola.length > 1 && (
                <span className="flex-shrink-0 rounded-full border-[1.5px] border-kr-navy bg-white px-2 py-0.5 text-xs font-extrabold">
                  +{cola.length - 1} más
                </span>
              )}
            </div>

            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-5">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-kr-muted">Cliente</p>
                <p className="font-extrabold">{pedidoActual.nombreCliente}</p>
                <p className="text-sm font-bold text-kr-muted">{pedidoActual.telefonoCliente}</p>
                <p className="mt-1 text-sm font-bold">{pedidoActual.direccion}</p>
                {pedidoActual.notas && <p className="mt-1 text-sm font-bold text-kr-muted">Nota: {pedidoActual.notas}</p>}
              </div>

              <div className="border-t border-kr-line pt-3">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-kr-muted">Productos</p>
                <ul className="flex flex-col gap-1.5">
                  {pedidoActual.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 text-sm">
                      <span className="font-bold">{item.quantity} × {item.name}</span>
                      <span className="font-extrabold tabular-nums whitespace-nowrap">{money(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-kr-line pt-3">
                <p className="text-sm font-extrabold text-kr-muted">{PAYMENT_LABEL[pedidoActual.paymentMethod]}</p>
                <p className="font-display text-2xl leading-none tabular-nums">{money(pedidoActual.total)}</p>
              </div>
            </div>

            <div className="flex gap-3 p-4 pt-0">
              <button type="button" onClick={cerrar} className={buttonClasses('secondary', 'lg', 'flex-1')}>
                Cerrar
              </button>
              <button type="button" onClick={verPedido} className={buttonClasses('primary', 'lg', 'flex-1')}>
                Ver pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
