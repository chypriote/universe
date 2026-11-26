// Pieces shared by the Gallery views of Trips and plans.
import { useEffect, useState, type MouseEvent } from 'react';
import type { AdminCityDetail } from '@/lib/journal';
import { projectLngLat } from '@/lib/china-map';
import { ChinaMap, type ChinaMapCity } from './ChinaMap';

/** Band colours of the Cities of one view, in order of first appearance. */
const BANDS = ['hsl(38 62% 34%)', 'hsl(44 75% 56%)', 'hsl(164 27% 33%)', 'hsl(210 25% 40%)', 'hsl(7 45% 55%)', 'hsl(280 18% 45%)'];
export const ON_THE_WAY_BAND = 'hsl(40 5% 60%)';
const NO_CITY_BAND = 'repeating-linear-gradient(90deg, var(--color-primary) 0 4px, transparent 4px 7px)';

export function bandColours(cityIds: (number | null)[]): Map<number, string> {
  const colours = new Map<number, string>();
  for (const id of cityIds) if (id !== null && !colours.has(id)) colours.set(id, BANDS[colours.size % BANDS.length]);
  return colours;
}

export type TileBand = { label: string; colour: string | null };

/** One Photo: its thumbnail, the band of its place and, at the start of a run, the place name. */
export function PhotoTile({
  thumb,
  name,
  portrait,
  band,
  showLabel,
  selected,
  onClick,
}: {
  thumb: string;
  name: string;
  portrait: boolean;
  band: TileBand;
  showLabel: boolean;
  selected: boolean;
  onClick: (event: MouseEvent) => void;
}) {
  return (
    <li className={portrait ? 'w-11' : 'w-24'}>
      <button
        type="button"
        aria-pressed={selected}
        title={name}
        onClick={onClick}
        className="block w-full cursor-pointer outline-offset-[-3px] aria-pressed:outline-3 aria-pressed:outline-primary"
      >
        <img src={thumb} alt={name} loading="lazy" className="h-16 w-full bg-surface object-cover" />
      </button>
      <span aria-hidden="true" className="mt-0.5 block h-1.5" style={{ background: band.colour ?? NO_CITY_BAND }} />
      <span className="block h-4 truncate text-[10px]" style={{ color: band.colour ?? 'var(--color-primary)' }}>
        {showLabel ? band.label : ''}
      </span>
    </li>
  );
}

/** Selection of Photos: click picks one, ctrl or cmd adds or drops one, shift adds the run from the last click. Esc clears. */
export function useSelection(order: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function click(id: number, event: MouseEvent) {
    if (event.shiftKey && anchor !== null) {
      const [from, to] = [order.indexOf(anchor), order.indexOf(id)].sort((a, b) => a - b);
      setSelected((current) => new Set([...current, ...order.slice(from, to + 1)]));
      return;
    }
    setAnchor(id);
    if (event.ctrlKey || event.metaKey) {
      setSelected((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    } else {
      setSelected((current) => (current.size === 1 && current.has(id) ? new Set() : new Set([id])));
    }
  }

  return { selected, setSelected, click };
}

/** Which accordions are open, saved in this browser under the key. */
export function useOpenSet(key: string) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      setOpen(new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]));
    } catch {
      setOpen(new Set());
    }
  }, [key]);

  function store(next: Set<string>) {
    setOpen(next);
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      // Private window: the state lives until the page closes.
    }
  }

  return {
    open,
    toggle: (id: string) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      store(next);
    },
    setAll: (ids: string[]) => store(new Set(ids)),
  };
}

/** A small map to pick the City of the selection, zoomed to the given Provinces. */
export function CityPickMap({
  cities,
  provinces,
  cityId,
  onPick,
}: {
  cities: AdminCityDetail[];
  provinces: string[];
  cityId: number | null;
  onPick: (cityId: number) => void;
}) {
  const [allChina, setAllChina] = useState(false);
  const zoomed = !allChina && provinces.length > 0;
  const shown = zoomed ? cities.filter((city) => provinces.includes(city.province)) : cities.filter((city) => city.major || city.id === cityId);
  const mapCities: ChinaMapCity[] = shown.map((city) => {
    const [x, y] = projectLngLat(city.lng, city.lat);
    return { key: String(city.id), name: city.name, zh: city.nameZh, x, y, major: city.major, province: city.province };
  });

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>City: click a dot</span>
        <button type="button" aria-pressed={allChina} className="cursor-pointer hover:text-primary" onClick={() => setAllChina(!allChina)}>
          {allChina ? 'Zoom in' : 'All China'}
        </button>
      </div>
      <ChinaMap
        regions={provinces.map((name) => ({ name, zh: '', visited: false }))}
        cities={mapCities}
        selectedCity={cityId === null ? null : String(cityId)}
        highlight={cityId === null ? [] : [String(cityId)]}
        zoomTo={zoomed ? provinces : null}
        cityLabels={zoomed}
        onSelectCity={(key) => onPick(Number(key))}
        preview={false}
      />
    </div>
  );
}

/** Upload one file per request, so a request stays under the Worker limits; asks before replacing a file. */
export async function uploadEach(
  files: File[],
  send: (file: File, overwrite: boolean) => Promise<{ ok: boolean; error?: string; photo?: { id: number } }>,
  where: string,
  onProgress: (done: number) => void,
): Promise<{ ids: number[]; failures: string[] }> {
  const ids: number[] = [];
  const failures: string[] = [];
  for (const [index, file] of files.entries()) {
    try {
      let result = await send(file, false);
      if (!result.ok && result.error === 'exists' && window.confirm(`"${file.name}" is already in this ${where}. Replace it?`)) {
        result = await send(file, true);
      }
      if (result.ok && result.photo) ids.push(result.photo.id);
      else if (result.error !== 'exists') failures.push(`${file.name}: ${result.error ?? 'failed'}`);
    } catch {
      failures.push(`${file.name}: upload failed`);
    }
    onProgress(index + 1);
  }
  return { ids, failures };
}
