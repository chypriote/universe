import { useState } from 'react';
import type { AdminActivity, AdminCity, AdminProvinceDetail, Airport } from '@/lib/journal';
import { projectLngLat } from '@/lib/china-map';
import { ActivitiesPanel } from './ActivitiesPanel';
import { AddCityForm, fieldClass as field } from './AddCityForm';
import { ChinaMap, type ChinaMapCity } from './ChinaMap';
import { Toast } from './Toast';

type Props = {
  provinces: AdminProvinceDetail[];
  provinceId: number;
  /** Every Activity and every City, for the Activities of the Province. */
  activities: AdminActivity[];
  cities: AdminCity[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ERRORS: Record<string, string> = {
  'unknown-province': 'Unknown Province: reload the page',
  'invalid-months': 'Invalid months',
  'invalid-code': 'An Airport code has 3 letters',
  'unknown-city': 'Unknown City: reload the page',
  'code-taken': 'Another City has this Airport',
  'invalid-weekdays': 'Invalid weekdays',
  'unknown-airport': 'Unknown Airport: reload the page',
};
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';
const toggle = (on: boolean) =>
  `cursor-pointer border px-2.5 py-1.5 text-sm ${on ? 'border-foreground bg-foreground text-background' : 'border-border bg-surface text-muted-foreground'}`;

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error?: string; airport?: Airport }> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json();
}

const flip = (list: number[], value: number) =>
  (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]).sort((a, b) => a - b);

/** Buttons to pick numbers 1…labels.length, pressed when picked. */
function Picker({ labels, value, onChange, name }: { labels: string[]; value: number[]; onChange: (next: number[]) => void; name: string }) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-1.5">
      {labels.map((label, index) => (
        <button key={label} type="button" aria-pressed={value.includes(index + 1)} className={toggle(value.includes(index + 1))} onClick={() => onChange(flip(value, index + 1))}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** One Airport of a City: its direct weekdays, saved or removed. */
function AirportRow({ airport, cityId, onNotice, onRemoved }: { airport: Airport; cityId: number; onNotice: (text: string) => void; onRemoved: () => void }) {
  const [weekdays, setWeekdays] = useState(airport.directWeekdays);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await send(`/api/admin/airports/${airport.code}`, 'PUT', { cityId, directWeekdays: weekdays });
    onNotice(result.ok ? `${airport.code} saved` : (ERRORS[result.error ?? ''] ?? result.error ?? ''));
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Remove ${airport.code}?`)) return;
    setBusy(true);
    const result = await send(`/api/admin/airports/${airport.code}`, 'DELETE');
    if (result.ok) onRemoved();
    else onNotice(ERRORS[result.error ?? ''] ?? result.error ?? '');
    setBusy(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className="w-12 font-medium tabular-nums">{airport.code}</span>
      <Picker labels={WEEKDAYS} value={weekdays} onChange={setWeekdays} name={`Direct flights to ${airport.code}`} />
      <button type="button" className={button} disabled={busy} onClick={() => void save()}>
        Save
      </button>
      <button type="button" className={`${button} text-error`} disabled={busy} onClick={() => void remove()}>
        Remove
      </button>
    </li>
  );
}

/** The Provinces admin: one Province at a time, its Season, its Cities and their Airports. */
export function AdminProvinces(props: Props) {
  const [provinces, setProvinces] = useState(props.provinces);
  const province = provinces.find((candidate) => candidate.id === props.provinceId)!;
  const [season, setSeason] = useState(province.season);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [newAirport, setNewAirport] = useState<Record<number, { code: string; weekdays: number[] }>>({});

  const describe = (months: number[]) => (months.length === 0 ? 'no Season' : months.map((month) => MONTHS[month - 1]).join(' '));
  const error = (code?: string) => ERRORS[code ?? ''] ?? code ?? '';

  function setAirports(cityId: number, change: (airports: Airport[]) => Airport[]) {
    setProvinces((list) =>
      list.map((item) => ({
        ...item,
        cities: item.cities.map((city) => (city.id === cityId ? { ...city, airports: change(city.airports) } : city)),
      })),
    );
  }

  async function saveSeason() {
    setBusy(true);
    const result = await send(`/api/admin/seasons/${province.id}`, 'PUT', { months: season });
    if (result.ok) {
      setProvinces((list) => list.map((item) => (item.id === province.id ? { ...item, season } : item)));
      setNotice(`Season of ${province.name} saved`);
    } else {
      setNotice(error(result.error));
    }
    setBusy(false);
  }

  async function addAirport(cityId: number) {
    const draft = newAirport[cityId] ?? { code: '', weekdays: [] };
    setBusy(true);
    const result = await send(`/api/admin/airports/${encodeURIComponent(draft.code.trim())}`, 'PUT', { cityId, directWeekdays: draft.weekdays });
    if (result.ok && result.airport) {
      const added = result.airport;
      setAirports(cityId, (airports) => [...airports.filter((item) => item.code !== added.code), added].sort((a, b) => a.code.localeCompare(b.code)));
      setNewAirport((drafts) => ({ ...drafts, [cityId]: { code: '', weekdays: [] } }));
      setNotice(`${added.code} added`);
    } else {
      setNotice(error(result.error));
    }
    setBusy(false);
  }

  const regions = provinces.map((item) => ({ name: item.name, zh: item.nameZh, detail: describe(item.season) }));
  const mapCities: ChinaMapCity[] = provinces.flatMap((item) =>
    item.cities.map((city) => {
      const [x, y] = projectLngLat(city.lng, city.lat);
      return { key: String(city.id), name: city.name, zh: city.nameZh, x, y, major: city.airports.length > 0 };
    }),
  );
  const withAirport = province.cities.filter((city) => city.airports.length > 0).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-6">
        <ChinaMap
          regions={regions}
          cities={mapCities}
          selectedRegion={province.name}
          onSelectRegion={(name) => {
            const picked = provinces.find((item) => item.name === name);
            if (picked) window.location.search = `?province=${picked.id}`;
          }}
          preview={false}
          regionTooltip
        />
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="eyebrow text-muted-foreground">Selected Province</p>
          <h2 className="font-serif text-4xl">
            {province.name} <span lang="zh" className="text-2xl text-muted-foreground">{province.nameZh}</span>
          </h2>
          <p className="eyebrow text-muted-foreground">Season · {describe(province.season)}</p>
          <p className="eyebrow text-muted-foreground">
            {province.cities.length} {province.cities.length === 1 ? 'City' : 'Cities'} · {withAirport} with an Airport
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-foreground" aria-hidden="true" />City with an Airport</span>
            <span className="flex items-center gap-2"><span className="size-3 rounded-full border border-foreground bg-background" aria-hidden="true" />City without</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
      <Toast text={notice} onDone={() => setNotice('')} />

      <section aria-labelledby="season-title" className="flex flex-col gap-4 border border-border p-6">
        <h2 id="season-title" className="font-serif text-2xl">
          Season
        </h2>
        <p className="text-sm text-muted-foreground">Season: the months when {province.name} is good to visit.</p>
        <Picker labels={MONTHS} value={season} onChange={setSeason} name="Season" />
        <button type="button" className={`${button} self-start`} disabled={busy} onClick={() => void saveSeason()}>
          Save Season
        </button>
      </section>

      <section aria-labelledby="cities-title" className="flex flex-col gap-6 border border-border p-6">
        <h2 id="cities-title" className="font-serif text-2xl">
          Cities and Airports
        </h2>
        <p className="text-sm text-muted-foreground">
          An Airport is one with flights from Paris. Pick the weekdays with a direct flight; none means flights with a stop only.
        </p>
        {province.cities.length === 0 && <p className="text-sm text-muted-foreground">No City in {province.name} yet.</p>}
        <ul className="flex flex-col divide-y divide-border">
          {province.cities.map((city) => {
            const draft = newAirport[city.id] ?? { code: '', weekdays: [] };
            const setDraft = (next: Partial<typeof draft>) => setNewAirport((drafts) => ({ ...drafts, [city.id]: { ...draft, ...next } }));
            return (
              <li key={city.id} className="flex flex-col gap-3 py-4">
                <a href={`/admin/cities?city=${city.id}`} className="font-serif text-xl hover:text-primary">
                  {city.name} <span lang="zh">{city.nameZh}</span>
                </a>
                <ul className="flex flex-col gap-2">
                  {city.airports.map((airport) => (
                    <AirportRow
                      key={airport.code}
                      airport={airport}
                      cityId={city.id}
                      onNotice={setNotice}
                      onRemoved={() => {
                        setAirports(city.id, (airports) => airports.filter((item) => item.code !== airport.code));
                        setNotice(`${airport.code} removed`);
                      }}
                    />
                  ))}
                </ul>
                <form
                  className="flex flex-wrap items-center gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addAirport(city.id);
                  }}
                >
                  <input
                    required
                    maxLength={3}
                    placeholder="Code"
                    aria-label={`New Airport of ${city.name}`}
                    value={draft.code}
                    onChange={(event) => setDraft({ code: event.target.value.toUpperCase() })}
                    className={`${field} w-20 uppercase`}
                  />
                  <Picker labels={WEEKDAYS} value={draft.weekdays} onChange={(weekdays) => setDraft({ weekdays })} name={`Direct flights to the new Airport of ${city.name}`} />
                  <button type="submit" className={button} disabled={busy}>
                    Add Airport
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="activities-title" className="flex flex-col gap-4 border border-border p-6">
        <h2 id="activities-title" className="font-serif text-2xl">
          Activities
        </h2>
        <ActivitiesPanel
          key={province.id}
          activities={props.activities}
          cities={props.cities}
          inScope={(activity) => activity.province === province.name}
          cityId={province.cities[0]?.id}
          groupByCity
          onNotice={setNotice}
        />
      </section>

      <AddCityForm
        provinces={provinces}
        provinceId={province.id}
        onAdded={() => window.location.reload()}
        onError={setNotice}
      />
      </div>
    </div>
  );
}
