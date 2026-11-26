import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminCityDetail, AdminPhoto, AdminProvince, DeletePhotosResult, KeptPhoto, PhotoTime } from '@/lib/journal';
import { button, field, makeThumb, MESSAGES } from './admin-form';
import { bandColours, CityPickMap, ON_THE_WAY_BAND, PhotoTile, uploadEach, useOpenSet, useSelection, type TileBand } from './gallery-parts';
import { Toast } from './Toast';

type Props = { trip: { slug: string; title: string }; photos: AdminPhoto[]; cities: AdminCityDetail[]; provinces: AdminProvince[] };

const TIMES: { value: PhotoTime | null; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: null, label: 'No time' },
];

const ERRORS: Record<string, string> = {
  ...MESSAGES,
  'no-date': 'no date in the file or its name: fill "Date if the file has none"',
  'unknown-province': 'Unknown Province',
  'invalid-date': 'Invalid date',
  'invalid-time': 'Invalid time',
};
const message = (error = '') => ERRORS[error] ?? error;

const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The place a Photo has, as the inspector edits it: a City id, or `way` for On the way. */
const placeOf = (photo: AdminPhoto) => (photo.city ? `city:${photo.city.id}` : 'way');

type Draft = { place: string; province: string; date: string; time: PhotoTime | null | 'mixed'; title: string };

/** The value every Photo shares, else the fallback. */
function common<T>(photos: AdminPhoto[], pick: (photo: AdminPhoto) => T, fallback: T): T {
  const values = new Set(photos.map(pick));
  return values.size === 1 ? [...values][0] : fallback;
}

function draftOf(photos: AdminPhoto[], provinces: AdminProvince[]): Draft {
  const place = common(photos, placeOf, '');
  const province = place === 'way' ? common(photos, (photo) => photo.province ?? '', '') : '';
  return {
    place,
    province: String(provinces.find((item) => item.name === province)?.id ?? ''),
    date: common(photos, (photo) => photo.date, ''),
    time: common<PhotoTime | null | 'mixed'>(photos, (photo) => photo.time, 'mixed'),
    title: photos.length === 1 ? (photos[0].title ?? '') : '',
  };
}

/** The Photos of one Trip by date and Time: what each Photo is (place, date, Time, title). Days and order are set in the Journal. */
export function GalleryTrip({ trip, cities, provinces, ...props }: Props) {
  const [photos, setPhotos] = useState(props.photos);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [fallbackDate, setFallbackDate] = useState('');
  const [kept, setKept] = useState<KeptPhoto[]>([]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const order = photos.map((photo) => photo.id);
  const { selected, setSelected, click } = useSelection(order);
  const accordion = useOpenSet(`gallery:trip:${trip.slug}`);
  const chosen = photos.filter((photo) => selected.has(photo.id));
  const selectionKey = [...selected].sort().join(',');
  const initial = useMemo(() => draftOf(chosen, provinces), [selectionKey, photos]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);

  const colours = bandColours(photos.map((photo) => photo.city?.id ?? null));
  const tripProvinces = [...new Set(photos.flatMap((photo) => (photo.city && photo.province ? [photo.province] : [])))];
  const dates = [...new Set(photos.map((photo) => photo.date))];
  const band = (photo: AdminPhoto): TileBand =>
    photo.city
      ? { label: photo.city.name, colour: colours.get(photo.city.id)! }
      : { label: photo.province ? `On the way, ${photo.province}` : 'On the way', colour: ON_THE_WAY_BAND };

  async function reload(select?: number[]) {
    const fresh: AdminPhoto[] = await (await fetch(`/api/admin/photos?trip=${encodeURIComponent(trip.slug)}`)).json();
    setPhotos(fresh);
    setSelected(new Set(select ?? fresh.filter((photo) => selected.has(photo.id)).map((photo) => photo.id)));
    return fresh;
  }

  async function send(file: File, overwrite: boolean) {
    const form = new FormData();
    form.set('trip', trip.slug);
    form.set('file', file, file.name);
    form.set('thumb', await makeThumb(file), `${file.name}.webp`);
    if (fallbackDate) form.set('date', fallbackDate);
    if (overwrite) form.set('overwrite', 'true');
    return (await fetch('/api/admin/photos', { method: 'POST', body: form })).json() as Promise<{ ok: boolean; error?: string; photo?: { id: number } }>;
  }

  async function upload(files: File[]) {
    setBusy(true);
    const { ids, failures } = await uploadEach(files, send, 'Trip', (done) => setProgress(`${done} of ${files.length} uploaded`));
    setProgress('');
    const fresh = await reload(ids);
    accordion.setAll([...accordion.open, ...fresh.filter((photo) => ids.includes(photo.id)).map((photo) => photo.date)]);
    setNotice(failures.length > 0 ? failures.map((failure) => failure.replace(/: (.*)$/, (_, error) => `: ${message(error)}`)).join('. ') : `${ids.length} uploaded and selected`);
    setBusy(false);
  }

  async function apply() {
    const body: Record<string, unknown> = { ids: [...selected] };
    if (draft.place !== initial.place || (draft.place === 'way' && draft.province !== initial.province)) {
      if (draft.place.startsWith('city:')) body.place = { cityId: Number(draft.place.slice(5)) };
      else if (draft.place === 'way') body.place = { onTheWay: true, ...(draft.province && { provinceId: Number(draft.province) }) };
    }
    if (draft.date && draft.date !== initial.date) body.date = draft.date;
    if (draft.time !== 'mixed' && draft.time !== initial.time) body.time = draft.time;
    if (chosen.length === 1 && draft.title !== initial.title) body.title = draft.title;
    if (Object.keys(body).length === 1) return setNotice('Nothing changed');
    setBusy(true);
    const response = await fetch('/api/admin/photos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result: { ok: boolean; error?: string; updated?: number } = await response.json();
    setNotice(result.ok ? `${result.updated} Photo(s) updated` : message(result.error));
    if (result.ok) await reload();
    setBusy(false);
  }

  async function remove(targets: number[], replacements: Record<string, number>) {
    setBusy(true);
    const response = await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: targets, replacements }),
    });
    const result: DeletePhotosResult = await response.json();
    setKept(result.kept);
    setPicks({});
    setNotice(
      result.kept.length > 0 ? `${result.deleted.length} deleted. ${result.kept.length} kept: a cover needs a replacement.` : `${result.deleted.length} deleted`,
    );
    await reload();
    setBusy(false);
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="gallery-title" className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="gallery-title" className="font-serif text-3xl">{trip.title}</h1>
          <span className="border border-border px-2 py-0.5 text-xs">{photos.length} Photos</span>
          <button type="button" className={`${button} ml-2`} disabled={busy} onClick={() => fileInput.current?.click()}>
            Upload to this Trip
          </button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Date if the file has none
            <input type="date" className={`${field} !py-1`} value={fallbackDate} onChange={(event) => setFallbackDate(event.target.value)} />
          </label>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept="image/jpeg,image/png,image/webp"
            aria-label="Photos to upload"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = '';
              if (files.length > 0) void upload(files);
            }}
          />
        </div>
        {progress && <p role="status" className="mt-2 text-sm text-muted-foreground">{progress}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <button type="button" className="cursor-pointer text-muted-foreground hover:text-primary" onClick={() => accordion.setAll(dates)}>
            Expand all
          </button>
          <button type="button" className="cursor-pointer text-muted-foreground hover:text-primary" onClick={() => accordion.setAll([])}>
            Collapse all
          </button>
          <span className="ml-auto flex flex-wrap gap-3">
            {[...colours].map(([id, colour]) => (
              <span key={id} className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-4" style={{ background: colour }} />
                {photos.find((photo) => photo.city?.id === id)?.city?.name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-4" style={{ background: ON_THE_WAY_BAND }} />
              On the way
            </span>
          </span>
        </div>

        <ul className="mt-2 border-t border-border">
          {dates.map((date) => {
            const ofDate = photos.filter((photo) => photo.date === date);
            const open = accordion.open.has(date);
            const places = [...new Set(ofDate.map((photo) => band(photo).label))];
            const day = ofDate.find((photo) => photo.day !== null)?.day;
            return (
              <li key={date} className="border-b border-border">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => accordion.toggle(date)}
                  className="flex w-full cursor-pointer items-baseline gap-3 py-2.5 text-left"
                >
                  <span aria-hidden="true" className="w-3 text-xs text-muted-foreground">{open ? '▾' : '▸'}</span>
                  <span className="font-serif text-lg text-gold-ink">{dayLabel(date)}</span>
                  <span className="text-xs text-muted-foreground">
                    {day ? `Day ${day} · ` : ''}
                    {ofDate.length} {ofDate.length === 1 ? 'Photo' : 'Photos'}
                    {!open && ` · ${places.join(', ')}`}
                  </span>
                </button>
                {open && (
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 pb-3 pl-6">
                    {TIMES.map(({ value, label }) => {
                      const run = ofDate.filter((photo) => photo.time === value);
                      if (run.length === 0) return null;
                      return (
                        <div key={label} className="contents">
                          <span className={`eyebrow pt-6 ${value === null ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
                          <ul className="flex flex-wrap gap-1.5">
                            {run.map((photo, index) => (
                              <PhotoTile
                                key={photo.id}
                                thumb={photo.thumb}
                                name={photo.name}
                                portrait={photo.orientation === 'portrait'}
                                band={band(photo)}
                                showLabel={index === 0 || band(run[index - 1]).label !== band(photo).label}
                                selected={selected.has(photo.id)}
                                onClick={(event) => click(photo.id, event)}
                              />
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
          {photos.length === 0 && <li className="py-6 text-sm text-muted-foreground">No Photo yet: upload some.</li>}
        </ul>
      </section>

      <aside aria-labelledby="inspector-title" className="flex flex-col gap-4 border-border xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:border-l xl:pl-6">
        <Toast text={notice} onDone={() => setNotice('')} />
        <div className="flex items-baseline justify-between">
          <h2 id="inspector-title" className="font-serif text-2xl">{selected.size} selected</h2>
          {selected.size > 0 && <span className="text-xs text-muted-foreground">Esc to clear</span>}
        </div>
        {selected.size === 0 ? (
          <p className="text-sm text-muted-foreground">Click a Photo to select it. Shift-click selects a run, Ctrl or Cmd-click adds one.</p>
        ) : (
          <>
            {chosen.length === 1 && <img src={chosen[0].thumb} alt={chosen[0].name} className="w-full bg-surface object-contain" />}
            <CityPickMap
              cities={cities}
              provinces={tripProvinces}
              cityId={draft.place.startsWith('city:') ? Number(draft.place.slice(5)) : null}
              onPick={(cityId) => setDraft({ ...draft, place: `city:${cityId}` })}
            />
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
              <label htmlFor="gallery-place" className="eyebrow text-muted-foreground">Place</label>
              <select id="gallery-place" className={field} value={draft.place} onChange={(event) => setDraft({ ...draft, place: event.target.value })}>
                {draft.place === '' && <option value="">Mixed: unchanged</option>}
                <option value="way">On the way</option>
                {cities.map((city) => (
                  <option key={city.id} value={`city:${city.id}`}>
                    {city.name} {city.nameZh} ({city.province})
                  </option>
                ))}
              </select>
              {draft.place === 'way' && (
                <>
                  <label htmlFor="gallery-province" className="eyebrow text-muted-foreground">Province</label>
                  <select id="gallery-province" className={field} value={draft.province} onChange={(event) => setDraft({ ...draft, province: event.target.value })}>
                    <option value="">None</option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <label htmlFor="gallery-date" className="eyebrow text-muted-foreground">Date</label>
              <input id="gallery-date" type="date" className={field} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              <span id="gallery-time" className="eyebrow text-muted-foreground">Time</span>
              <div role="group" aria-labelledby="gallery-time" className="flex">
                {[TIMES[3], ...TIMES.slice(0, 3)].map(({ value, label }) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={draft.time === value}
                    onClick={() => setDraft({ ...draft, time: value })}
                    className="-ml-px flex-1 cursor-pointer border border-border px-1 py-1.5 text-xs first:ml-0 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                  >
                    {value === null ? '—' : label}
                  </button>
                ))}
              </div>
              {chosen.length === 1 && (
                <>
                  <label htmlFor="gallery-title-field" className="eyebrow text-muted-foreground">Title</label>
                  <input
                    id="gallery-title-field"
                    className={field}
                    placeholder="Optional, replaces the place"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <button type="button" className="btn btn-primary cursor-pointer !px-4 !py-2" disabled={busy} onClick={() => void apply()}>
                Apply to {selected.size}
              </button>
              <button
                type="button"
                className={`${button} text-error`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete ${selected.size} Photo(s) for good? Their files are removed too.`)) {
                    setKept([]);
                    void remove([...selected], {});
                  }
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
        {kept.length > 0 && (
          <section aria-labelledby="kept-title" className="flex flex-col gap-3 border border-error p-4">
            <h3 id="kept-title" className="font-serif text-xl">Covers to replace</h3>
            {kept.map((photo) => (
              <div key={photo.id}>
                <p className="text-sm font-medium">{photo.name}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {photo.covers.map((cover) => (
                    <li key={cover.key} className="flex flex-col gap-1 text-sm">
                      <span>{cover.label}</span>
                      <select
                        className={field}
                        aria-label={`Replacement for ${cover.label}`}
                        value={picks[cover.key] ?? ''}
                        onChange={(event) => setPicks((current) => ({ ...current, [cover.key]: Number(event.target.value) }))}
                      >
                        <option value="">Pick a replacement</option>
                        {cover.replacements.map((choice) => (
                          <option key={choice.id} value={choice.id}>
                            {choice.name}
                          </option>
                        ))}
                      </select>
                      <a href={cover.href}>Set it there instead</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button
              type="button"
              className={`${button} self-start`}
              disabled={busy || Object.keys(picks).length === 0}
              onClick={() => void remove(kept.map((photo) => photo.id), picks)}
            >
              Delete with these replacements
            </button>
          </section>
        )}
        <p className="text-xs text-muted-foreground">
          Days and order are set in the <a href={`/admin/trips/${trip.slug}`}>Journal</a>.
        </p>
      </aside>
    </div>
  );
}
