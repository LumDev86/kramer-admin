import { Repartidor } from './api';

// más viejo que esto se trata como stale (la app pudo haber crasheado sin llamar a
// /desconectar) - no cuenta como "en línea" aunque `conectado` siga en true en la base.
// Un solo lugar para este umbral: antes vivía únicamente en RepartidoresMap.tsx y la pantalla
// de detalle del pedido filtraba a los repartidores con un criterio distinto (el booleano
// `conectado` crudo), así que un repartidor con `conectado: true` pero ubicación vieja
// desaparecía de las dos listas a la vez - no salía en el mapa (por viejo) ni en la lista de
// respaldo "activos sin conectar" (porque en la base figuraba como conectado).
export const STALE_MS = 3 * 60 * 1000;

export const estaEnLinea = (r: Repartidor): boolean =>
  r.conectado &&
  r.lat !== null &&
  r.lng !== null &&
  r.ubicacionAt !== null &&
  Date.now() - new Date(r.ubicacionAt).getTime() < STALE_MS;

// distancia en línea recta entre dos puntos (Haversine) - alcanza para "quién está más cerca
// del local" en un radio de barrio, sin necesidad de llamar a ninguna API de rutas paga
export const distanciaKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
