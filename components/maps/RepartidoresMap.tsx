'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Repartidor } from '@/lib/api';
import { distanciaKm } from '@/lib/geo';

// pines propios con divIcon (SVG inline) en vez del ícono default de Leaflet - el default
// rompe con bundlers modernos porque referencia imágenes por una ruta relativa que no existe
// en el build, y esto además nos deja poner colores distintos sin sumar assets.
const pinIcon = (color: string, size = 30) =>
  L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 11.5 7.3 11.77a1 1 0 0 0 1.4 0C13 21.5 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

const ICON_LOCAL = pinIcon('#f97316', 32); // naranja - el local
const ICON_REPARTIDOR = pinIcon('#16a34a', 28); // verde - repartidor conectado
const ICON_REPARTIDOR_SELECCIONADO = pinIcon('#2563eb', 32); // azul - seleccionado
const ICON_DESTINO = pinIcon('#9333ea', 30); // morado - destino del pedido

// más viejo que esto se trata como stale (la app pudo haber crasheado sin llamar a
// /desconectar) - no se muestra en el mapa aunque conectado siga en true en la base
const STALE_MS = 3 * 60 * 1000;

const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

// encuadra el mapa para que entren todos los puntos relevantes a la vez - center/zoom fijos
// (más abajo) alcanzan cuando el único punto de referencia es el local, pero con un destino
// lejos (ej. un pedido en Canning) puede quedar fuera de esos ~14 de zoom
const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
};

interface Props {
  repartidores: Repartidor[];
  storeLat: number | null;
  storeLng: number | null;
  destino?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  onSelect?: (repartidorId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  size?: number;
}

export default function RepartidoresMap({
  repartidores,
  storeLat,
  storeLng,
  destino,
  selectedId,
  onSelect,
  onMapClick,
  size = 480,
}: Props) {
  const conectados = useMemo(() => {
    const now = Date.now();
    return repartidores.filter(
      (r) =>
        r.conectado &&
        r.lat !== null &&
        r.lng !== null &&
        r.ubicacionAt &&
        now - new Date(r.ubicacionAt).getTime() < STALE_MS
    );
  }, [repartidores]);

  const center: [number, number] =
    storeLat !== null && storeLng !== null
      ? [storeLat, storeLng]
      : conectados[0]
      ? [conectados[0].lat!, conectados[0].lng!]
      : [-34.8222, -58.5358]; // fallback: Ezeiza, por si todavía no se cargó ninguna ubicación

  // solo se arma cuando hay un destino que mostrar - en los otros usos de este componente
  // (lista de repartidores, selector de ubicación del local) no se pasa `destino` y el mapa
  // se comporta como siempre (center/zoom fijos de arriba)
  const boundsPoints: [number, number][] = destino
    ? [
        ...(storeLat !== null && storeLng !== null ? [[storeLat, storeLng] as [number, number]] : []),
        [destino.lat, destino.lng],
        ...conectados.map((r): [number, number] => [r.lat!, r.lng!]),
      ]
    : [];

  return (
    <div
      style={{ width: size, height: size, maxWidth: '100%' }}
      // `isolate` contiene el z-index interno de Leaflet (sus controles llegan a z-index:1000)
      // dentro de este stacking context - sin esto, los controles del mapa quedaban por encima
      // de cualquier modal con z-index menor a 1000 (ej. ConfirmModal, z-50), tapándolo
      className="mx-auto rounded-2xl overflow-hidden border border-gray-100 isolate"
    >
      {/* MapContainer solo aplica center/zoom en el mount inicial (react-leaflet no lo
          re-centra si el prop cambia después) - si la ubicación del local llega asíncrona
          (después del primer render, con center todavía en el fallback), el mapa quedaba
          centrado en el lugar viejo. La key fuerza un remount apenas cambia el centro real. */}
      <MapContainer key={center.join(',')} center={center} zoom={14} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && <MapClickHandler onClick={onMapClick} />}
        {boundsPoints.length > 1 && <FitBounds points={boundsPoints} />}

        {storeLat !== null && storeLng !== null && (
          <Marker position={[storeLat, storeLng]} icon={ICON_LOCAL}>
            <Popup>Kiosco Kramer (local)</Popup>
          </Marker>
        )}

        {destino && (
          <Marker position={[destino.lat, destino.lng]} icon={ICON_DESTINO}>
            <Popup>Destino del pedido</Popup>
          </Marker>
        )}

        {conectados.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat!, r.lng!]}
            icon={r.id === selectedId ? ICON_REPARTIDOR_SELECCIONADO : ICON_REPARTIDOR}
            eventHandlers={onSelect ? { click: () => onSelect(r.id) } : undefined}
          >
            <Popup>
              <p className="font-bold">{r.nombre}</p>
              {storeLat !== null && storeLng !== null && (
                <p className="text-xs text-gray-500">
                  {distanciaKm(storeLat, storeLng, r.lat!, r.lng!).toFixed(1)} km del local
                </p>
              )}
              {destino && (
                <p className="text-xs text-gray-500">
                  {distanciaKm(destino.lat, destino.lng, r.lat!, r.lng!).toFixed(1)} km del destino
                </p>
              )}
              {onSelect && (
                <button
                  onClick={() => onSelect(r.id)}
                  className="mt-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Asignar a {r.nombre.split(' ')[0]}
                </button>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
