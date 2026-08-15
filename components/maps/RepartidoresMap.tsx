'use client';

import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

// más viejo que esto se trata como stale (la app pudo haber crasheado sin llamar a
// /desconectar) - no se muestra en el mapa aunque conectado siga en true en la base
const STALE_MS = 3 * 60 * 1000;

const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

interface Props {
  repartidores: Repartidor[];
  storeLat: number | null;
  storeLng: number | null;
  selectedId?: string | null;
  onSelect?: (repartidorId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}

export default function RepartidoresMap({
  repartidores,
  storeLat,
  storeLng,
  selectedId,
  onSelect,
  onMapClick,
  height = '360px',
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

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden border border-gray-100">
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

        {storeLat !== null && storeLng !== null && (
          <Marker position={[storeLat, storeLng]} icon={ICON_LOCAL}>
            <Popup>Kiosco Kramer (local)</Popup>
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
