import { useState } from 'react';
import type {
  AdminProvinceDetail,
  Airport,
  CoverCandidate,
  FocalPoint,
  VisitedProvince,
} from '@/lib/journal';
import { fieldClass as field } from './AddCityForm';
import { FocalFrame } from './FocalFrame';

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
  'unknown-photo': 'That Photo cannot be the cover: reload the page',
  'no-cover': 'The Province has no chosen cover: reload the page',
  'invalid-focus': 'That position is not valid',
};
export const button =
  'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';
const toggle = (on: boolean) =>
  `cursor-pointer border px-2.5 py-1.5 text-sm ${on ? 'border-foreground bg-foreground text-background' : 'border-border bg-surface text-muted-foreground'}`;
const error = (code?: string) => ERRORS[code ?? ''] ?? code ?? 'The request failed';

type Result = { ok: boolean; error?: string; airport?: Airport };

export async function send(url: string, method: string, body?: unknown): Promise<Result> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return { ok: false };
  }
}

const flip = (list: number[], value: number) =>
  (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]).sort(
    (a, b) => a - b,
  );

/** Buttons to pick numbers 1…labels.length, pressed when picked. */
function Picker({
  labels,
  value,
  onChange,
  name,
}: {
  labels: string[];
  value: number[];
  onChange: (next: number[]) => void;
  name: string;
}) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap gap-1.5">
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          aria-pressed={value.includes(index + 1)}
          className={toggle(value.includes(index + 1))}
          onClick={() => onChange(flip(value, index + 1))}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Season({
  province,
  onNotice,
}: {
  province: AdminProvinceDetail;
  onNotice: (text: string) => void;
}) {
  const [season, setSeason] = useState(province.season);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await send(`/api/admin/seasons/${province.id}`, 'PUT', { months: season });
    onNotice(result.ok ? `Season of ${province.name} saved` : error(result.error));
    setBusy(false);
  }

  return (
    <section aria-labelledby="season-title" className="flex flex-col gap-3">
      <h3 id="season-title" className="eyebrow text-muted-foreground">
        Season
      </h3>
      <p className="text-sm text-muted-foreground">
        The months when {province.name} is good to visit.
      </p>
      <Picker labels={MONTHS} value={season} onChange={setSeason} name="Season" />
      <button
        type="button"
        className={`${button} self-start`}
        disabled={busy}
        onClick={() => void save()}
      >
        Save Season
      </button>
    </section>
  );
}

/** The Province Cover of a Visited Province: pick it from the Province's Photos, drag its focal point, or clear it. */
function Cover({
  initial,
  onNotice,
}: {
  initial: VisitedProvince;
  onNotice: (text: string) => void;
}) {
  const [province, setProvince] = useState(initial);
  const [candidates, setCandidates] = useState<CoverCandidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const url = (path: string) => `/api/admin/provinces/${encodeURIComponent(province.name)}/${path}`;

  async function refresh() {
    try {
      const list: VisitedProvince[] = await (await fetch('/api/admin/provinces')).json();
      const fresh = list.find((item) => item.name === province.name);
      if (fresh) setProvince(fresh);
    } catch {
      onNotice('Saved, but the cover did not reload');
    }
  }

  async function open() {
    if (candidates) return setCandidates(null);
    setBusy(true);
    try {
      const response = await fetch(url('candidates'));
      if (!response.ok) throw new Error();
      setCandidates(await response.json());
    } catch {
      onNotice('The Photos did not load');
    }
    setBusy(false);
  }

  async function change(method: string, path: string, body?: unknown) {
    setBusy(true);
    const result = await send(url(path), method, body);
    if (result.ok) {
      setCandidates(null);
      await refresh();
    } else {
      onNotice(error(result.error));
    }
    setBusy(false);
  }

  async function reposition(focus: FocalPoint) {
    setBusy(true);
    const result = await send(url('focus'), 'PUT', focus);
    if (result.ok) setProvince((current) => ({ ...current, focus }));
    else onNotice(error(result.error));
    setBusy(false);
  }

  return (
    <section aria-labelledby="cover-title" className="flex flex-col gap-3">
      <h3 id="cover-title" className="eyebrow text-muted-foreground">
        Home cover
      </h3>
      <div className="flex flex-wrap items-start gap-4">
        {province.photo ? (
          <FocalFrame
            className="aspect-[4/3] w-56 shrink-0"
            photo={province.photo}
            focus={province.focus ?? { x: 50, y: 50 }}
            disabled={busy}
            onCommit={province.fallback ? undefined : (focus) => void reposition(focus)}
          />
        ) : (
          <div className="aspect-[4/3] w-56 shrink-0 bg-surface" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-2">
          <p className={`eyebrow ${province.fallback ? 'text-muted-foreground' : 'text-gold-ink'}`}>
            {province.fallback ? 'Fallback: first Photo' : 'Chosen cover'}
          </p>
          {!province.fallback && (
            <p className="text-xs text-muted-foreground">Drag the Photo to choose what shows.</p>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            aria-expanded={candidates !== null}
            onClick={() => void open()}
          >
            {candidates ? 'Close' : 'Pick a cover'}
          </button>
          {!province.fallback && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void change('DELETE', 'cover')}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {candidates && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {candidates.length === 0 && (
            <li className="col-span-full text-sm text-muted-foreground">
              No Photo with a City in this Province.
            </li>
          )}
          {candidates.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={photo.id === province.coverId}
                aria-label={`${photo.name}, ${photo.tripTitle}`}
                className="block w-full cursor-pointer border-2 border-transparent text-left aria-pressed:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void change('PUT', 'cover', { photoId: photo.id })}
              >
                <img
                  src={photo.thumb}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-surface object-cover"
                />
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {photo.tripTitle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One Airport of a City: its direct weekdays, saved or removed. */
function AirportRow({
  airport,
  cityId,
  onNotice,
  onRemoved,
}: {
  airport: Airport;
  cityId: number;
  onNotice: (text: string) => void;
  onRemoved: () => void;
}) {
  const [weekdays, setWeekdays] = useState(airport.directWeekdays);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await send(`/api/admin/airports/${airport.code}`, 'PUT', {
      cityId,
      directWeekdays: weekdays,
    });
    onNotice(result.ok ? `${airport.code} saved` : error(result.error));
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Remove ${airport.code}?`)) return;
    setBusy(true);
    const result = await send(`/api/admin/airports/${airport.code}`, 'DELETE');
    if (result.ok) onRemoved();
    else onNotice(error(result.error));
    setBusy(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className="w-12 font-medium tabular-nums">{airport.code}</span>
      <Picker
        labels={WEEKDAYS}
        value={weekdays}
        onChange={setWeekdays}
        name={`Direct flights to ${airport.code}`}
      />
      <button type="button" className={button} disabled={busy} onClick={() => void save()}>
        Save
      </button>
      <button
        type="button"
        className={`${button} text-error`}
        disabled={busy}
        onClick={() => void remove()}
      >
        Remove
      </button>
    </li>
  );
}

function Airports({
  province,
  onNotice,
}: {
  province: AdminProvinceDetail;
  onNotice: (text: string) => void;
}) {
  const [cities, setCities] = useState(province.cities);
  const [drafts, setDrafts] = useState<Record<number, { code: string; weekdays: number[] }>>({});
  const [busy, setBusy] = useState(false);

  const setAirports = (cityId: number, change: (airports: Airport[]) => Airport[]) =>
    setCities((list) =>
      list.map((city) =>
        city.id === cityId ? { ...city, airports: change(city.airports) } : city,
      ),
    );

  async function add(cityId: number) {
    const draft = drafts[cityId] ?? { code: '', weekdays: [] };
    setBusy(true);
    const result = await send(
      `/api/admin/airports/${encodeURIComponent(draft.code.trim())}`,
      'PUT',
      { cityId, directWeekdays: draft.weekdays },
    );
    if (result.ok && result.airport) {
      const added = result.airport;
      setAirports(cityId, (airports) =>
        [...airports.filter((item) => item.code !== added.code), added].sort((a, b) =>
          a.code.localeCompare(b.code),
        ),
      );
      setDrafts((current) => ({ ...current, [cityId]: { code: '', weekdays: [] } }));
      onNotice(`${added.code} added`);
    } else {
      onNotice(error(result.error));
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="airports-title" className="flex flex-col gap-3">
      <h3 id="airports-title" className="eyebrow text-muted-foreground">
        Cities and Airports
      </h3>
      <p className="text-sm text-muted-foreground">
        An Airport is one with flights from Paris. Pick the weekdays with a direct flight; none
        means flights with a stop only.
      </p>
      {cities.length === 0 && (
        <p className="text-sm text-muted-foreground">No City in {province.name} yet.</p>
      )}
      <ul className="flex flex-col divide-y divide-border border border-border">
        {cities.map((city) => {
          const draft = drafts[city.id] ?? { code: '', weekdays: [] };
          const setDraft = (next: Partial<typeof draft>) =>
            setDrafts((current) => ({ ...current, [city.id]: { ...draft, ...next } }));
          return (
            <li key={city.id} className="flex flex-col gap-3 p-4">
              <a
                href={`/admin/atlas?city=${city.id}`}
                className="font-serif text-xl hover:text-primary"
              >
                {city.name} <span lang="zh">{city.nameZh}</span>
              </a>
              <ul className="flex flex-col gap-2">
                {city.airports.map((airport) => (
                  <AirportRow
                    key={airport.code}
                    airport={airport}
                    cityId={city.id}
                    onNotice={onNotice}
                    onRemoved={() => {
                      setAirports(city.id, (airports) =>
                        airports.filter((item) => item.code !== airport.code),
                      );
                      onNotice(`${airport.code} removed`);
                    }}
                  />
                ))}
              </ul>
              <form
                className="flex flex-wrap items-center gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void add(city.id);
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
                <Picker
                  labels={WEEKDAYS}
                  value={draft.weekdays}
                  onChange={(weekdays) => setDraft({ weekdays })}
                  name={`Direct flights to the new Airport of ${city.name}`}
                />
                <button type="submit" className={button} disabled={busy}>
                  Add Airport
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The Overview of a Province in the Atlas: its Season, its home cover when visited, its Cities and their Airports. */
export function ProvinceOverview({
  province,
  visited,
  onNotice,
}: {
  province: AdminProvinceDetail;
  visited?: VisitedProvince;
  onNotice: (text: string) => void;
}) {
  return (
    <div className="grid gap-10 xl:grid-cols-2">
      <div className="flex flex-col gap-10">
        <Season province={province} onNotice={onNotice} />
        {visited ? (
          <Cover initial={visited} onNotice={onNotice} />
        ) : (
          <p className="text-sm text-muted-foreground">Not a Visited Province: no home cover.</p>
        )}
      </div>
      <Airports province={province} onNotice={onNotice} />
    </div>
  );
}
