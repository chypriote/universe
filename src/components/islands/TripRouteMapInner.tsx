import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { TripRoute, TripRouteStop } from '@/lib/itineraries.server';
import 'leaflet/dist/leaflet.css';
import './trip-route-map.css';

const ROUTE_COLOR = 'hsl(17 60% 49%)';
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createCityIcon(city: TripRouteStop): L.DivIcon {
  return L.divIcon({
    className: 'trip-route-marker',
    html: `<div class="trip-route-pin">
      <span class="trip-route-pin__dot"></span>
      <span class="trip-route-pin__label">
        <span class="trip-route-pin__name">${escapeHtml(city.name)}</span>
        <span class="trip-route-pin__days">Days ${escapeHtml(city.dayLabel)}</span>
      </span>
    </div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });
}

function FitStops({ stops }: { stops: TripRouteStop[] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (stops.length === 0) return;

    const bounds = L.latLngBounds(stops.map((stop) => [stop.lat, stop.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 9 });
  }, [map, stops]);

  return null;
}

function ScrollZoomOnFocus() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    map.scrollWheelZoom.disable();
    container.tabIndex = 0;

    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    const focus = () => container.focus();

    container.addEventListener('focus', enable);
    container.addEventListener('blur', disable);
    container.addEventListener('click', focus);

    return () => {
      container.removeEventListener('focus', enable);
      container.removeEventListener('blur', disable);
      container.removeEventListener('click', focus);
    };
  }, [map]);

  return null;
}

function scrollToDay(day: number) {
  document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

type TripRouteMapInnerProps = {
  route: TripRoute;
};

export function TripRouteMapInner({ route }: TripRouteMapInnerProps) {
  const positions = route.stops.map((stop) => [stop.lat, stop.lng] as [number, number]);
  const center = positions[0] ?? [35, 105];

  return (
    <MapContainer
      className="trip-route-map"
      style={{ height: '100%', width: '100%' }}
      center={center}
      zoom={5}
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
      <FitStops stops={route.stops} />
      <ScrollZoomOnFocus />
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: ROUTE_COLOR, weight: 2.5, opacity: 0.9 }}
        />
      )}
      {route.cities.map((city) => (
        <Marker
          key={`${city.name}-${city.dayLabel}`}
          position={[city.lat, city.lng]}
          icon={createCityIcon(city)}
          eventHandlers={{
            click: () => scrollToDay(city.days[0]),
          }}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {city.name} · Days {city.dayLabel}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
