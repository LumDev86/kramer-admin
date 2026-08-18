import { PedidoStatus } from './api';

export const money = (value: number | string) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// wa.me necesita el número con código de país sin signos; si ya viene con 54 lo dejamos,
// si no, asumimos Argentina (mercado de esta tienda) y se lo agregamos como mejor esfuerzo
export const toWhatsappNumber = (telefono: string): string => {
  const digits = telefono.replace(/\D/g, '');
  return digits.startsWith('54') ? digits : `549${digits}`;
};

export const waLink = (telefono: string, mensaje: string) =>
  `https://wa.me/${toWhatsappNumber(telefono)}?text=${encodeURIComponent(mensaje)}`;

// PEDIDO_STATUS_LABEL: no confundir con el STATUS_LABEL de Factura (distribuidoras/[id]/page.tsx)
// - mismo nombre, dominio distinto, se quedó separado a propósito
export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  NUEVO: 'Nuevo',
  EN_PREPARACION: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export const PAYMENT_LABEL: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia' };
