import { useEffect, useState } from 'react';
import { Pedido, PedidoStatus } from '@/lib/api';
import type { ChipTone } from '@/components/ui/Chip';

export const STATUS_TONE: Record<PedidoStatus, ChipTone> = {
  NUEVO: 'warn',
  EN_PREPARACION: 'info',
  EN_CAMINO: 'info',
  ENTREGADO: 'ok',
  CANCELADO: 'off',
};

// pasado este tiempo desde que entró, el pedido se marca en naranja ("se está demorando")
export const DEMORA_MIN = 30;

export const minutosDesde = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

export const haceCuanto = (min: number) => {
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min >= 1440) {
    const d = Math.floor(min / 1440);
    return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `hace ${h} h${m ? ` ${m} min` : ''}`;
};

export const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

// el envío viaja como un ítem más del pedido: no cuenta como "producto"
export const esEnvio = (item: { productId: string | null; name: string }) => !item.productId && item.name === 'Envío';

export const cantidadProductos = (p: Pedido) => p.items.filter((i) => !esEnvio(i)).reduce((s, i) => s + i.quantity, 0);

// reloj que avanza solo, para que el "hace cuánto" se actualice sin recargar
export function useAhora(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
