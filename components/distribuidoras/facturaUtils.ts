import type { Factura } from '@/lib/api';
import type { ChipTone } from '@/components/ui/Chip';

// FACTURA_STATUS_LABEL: no confundir con PEDIDO_STATUS_LABEL (lib/format.ts) - dominio distinto
export const FACTURA_STATUS_LABEL: Record<Factura['status'], string> = {
  PENDING_REVIEW: 'Sin confirmar',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
};

export const FACTURA_STATUS_TONE: Record<Factura['status'], ChipTone> = {
  PENDING_REVIEW: 'warn',
  CONFIRMED: 'ok',
  CANCELLED: 'off',
};

export const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

export const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// la fecha que cuenta para el gasto es la de confirmación (cuando entró la mercadería)
export const fechaGasto = (f: Factura) => f.confirmedAt ?? f.createdAt;

export const facturaHref = (distribuidorId: string, facturaId: string) => `/distribuidoras/${distribuidorId}/facturas/${facturaId}`;
