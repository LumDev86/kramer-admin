'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell } from '@phosphor-icons/react';
import { pedidos, Pedido } from '@/lib/api';
import { money, PAYMENT_LABEL } from '@/lib/format';

// más rápido que el refetchInterval de la pantalla de Pedidos (15000) - el aviso sonoro tiene
// que notarse apenas entra el pedido, no en cualquier momento dentro de una ventana de 15s
const POLL_INTERVAL_MS = 8000;

// Montado una sola vez en el layout del admin (no en la pantalla de Pedidos) para que la alerta
// suene y el modal aparezca sin importar qué sección del panel se esté mirando. Reemplaza al
// push del sistema operativo como forma principal de aviso: acá se elige el sonido y se
// muestran los datos completos del pedido en vez de depender de una notificación nativa.
// Limitación real (ya documentada en lib/notificationSound.ts): un audio propio de la página
// solo sale si esta pestaña está activa/en foreground - si el navegador está minimizado o en
// segundo plano, esto no suena. El push del Service Worker se deja como respaldo para ese caso.
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slideUp overflow-hidden">
            <div className="bg-orange-500 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell size={20} weight="fill" className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-extrabold text-lg leading-tight">¡Pedido nuevo!</p>
                <p className="text-orange-100 text-xs font-semibold">{pedidoActual.numero}</p>
              </div>
              {cola.length > 1 && (
                <span className="text-xs font-bold text-white bg-white/20 rounded-full px-2 py-1 flex-shrink-0">
                  +{cola.length - 1}
                </span>
              )}
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                <p className="font-semibold text-gray-800">{pedidoActual.nombreCliente}</p>
                <p className="text-sm text-gray-500">{pedidoActual.telefonoCliente}</p>
                <p className="text-sm text-gray-500 mt-1">{pedidoActual.direccion}</p>
                {pedidoActual.notas && <p className="text-xs text-gray-400 mt-1">📝 {pedidoActual.notas}</p>}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Productos</p>
                <div className="flex flex-col gap-1.5">
                  {pedidoActual.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.quantity} × {item.name}</span>
                      <span className="font-semibold text-gray-700">{money(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400 font-semibold">{PAYMENT_LABEL[pedidoActual.paymentMethod]}</p>
                <p className="text-xl font-extrabold text-orange-500">{money(pedidoActual.total)}</p>
              </div>
            </div>

            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={cerrar}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={verPedido}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
              >
                Ver pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
