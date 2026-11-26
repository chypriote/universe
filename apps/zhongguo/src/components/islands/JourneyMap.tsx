import { useState } from 'react';
import type { AdminCityDetail } from '@/lib/journal';
import { projectLngLat } from '@/lib/china-map';
import { ChinaMap, type ChinaMapCity } from './ChinaMap';

export type JourneyDay = { label: string; city: { id: number }; route: { id: number }[] };

type Props = {
  /** Every City, for its position. */
  cities: AdminCityDetail[];
  days: JourneyDay[];
  /** The Day being edited: its Cities light up. */
  active: JourneyDay | null;
};

const citiesOf = (day: JourneyDay) => (day.route.length > 0 ? day.route : [day.city]).map((city) => city.id);

/** The route of a Trip or plan on the China map, zoomed to its Provinces; a City opens in the Atlas. */
export function JourneyMap({ cities, days, active }: Props) {
  const [allChina, setAllChina] = useState(false);
  const byId = new Map(cities.map((city) => [city.id, city]));
  const route = days.flatMap(citiesOf).filter((id, index, list) => id !== list[index - 1] && byId.has(id));
  const stops = [...new Set(route)].map((id) => byId.get(id)!);
  const provinces = [...new Set(stops.map((city) => city.province))];
  const mapCities: ChinaMapCity[] = stops.map((city) => {
    const [x, y] = projectLngLat(city.lng, city.lat);
    return { key: String(city.id), name: city.name, zh: city.nameZh, x, y, major: city.major, province: city.province };
  });
  const lit = active ? citiesOf(active) : [];

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="truncate">
          Route
          {active && (
            <>
              {' · '}
              <span className="text-primary">
                {active.label}: {lit.map((id) => byId.get(id)?.name).join(' → ')}
              </span>
            </>
          )}
        </span>
        <button type="button" aria-pressed={allChina} className="shrink-0 cursor-pointer hover:text-primary" onClick={() => setAllChina(!allChina)}>
          {allChina ? 'Zoom to the route' : 'All China'}
        </button>
      </div>
      <ChinaMap
        regions={provinces.map((name) => ({ name, zh: '', visited: false }))}
        cities={mapCities}
        route={route.map(String)}
        highlight={lit.map(String)}
        zoomTo={allChina ? null : provinces}
        cityLabels={!allChina}
        onSelectRegion={(name) => window.open(`/admin/atlas?province=${encodeURIComponent(name)}`, '_blank')}
        onSelectCity={(key) => window.open(`/admin/atlas?city=${key}`, '_blank')}
        preview={false}
      />
    </div>
  );
}
