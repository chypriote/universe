import { useState } from 'react';
import type { AdminCityDetail, AdminProvince, CityPhoto } from '@/lib/journal';
import { cityError, fieldClass as field } from './AddCityForm';
import { button } from './AtlasProvince';

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json();
}

const COVER_ERRORS: Record<string, string> = {
  'unknown-province': 'The Province is not a Visited Province, so it has no home cover',
  'unknown-photo': 'That Photo cannot be the cover: reload the page',
};

type PhotosProps = {
  city: AdminCityDetail;
  cities: AdminCityDetail[];
  provinces: AdminProvince[];
  photos: CityPhoto[];
  onNotice: (text: string) => void;
};

/** The Photos of a City from every Trip: filter by Trip, move them to another City or On the way, or make one the home cover. */
export function CityPhotos({ city, cities, provinces, onNotice, ...props }: PhotosProps) {
  const [photos, setPhotos] = useState(props.photos);
  const [trip, setTrip] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState('');
  const [onTheWayProvince, setOnTheWayProvince] = useState('');
  const [busy, setBusy] = useState(false);

  const trips = [...new Map(photos.map((photo) => [photo.trip.slug, photo.trip])).values()];
  const shown = trip ? photos.filter((photo) => photo.trip.slug === trip) : photos;
  const ids = [...selected];

  async function move(place: unknown) {
    setBusy(true);
    const result = await send<{ ok: boolean; error?: string; updated?: number }>(
      '/api/admin/photos',
      'PATCH',
      { ids, place },
    );
    onNotice(result.ok ? `${result.updated} Photo(s) moved` : cityError(result.error ?? ''));
    if (result.ok) {
      setPhotos(await send<CityPhoto[]>(`/api/admin/cities/${city.id}`, 'GET'));
      setSelected(new Set());
    }
    setBusy(false);
  }

  async function makeCover() {
    setBusy(true);
    const result = await send<{ ok: boolean; error?: string }>(
      `/api/admin/provinces/${encodeURIComponent(city.province)}/cover`,
      'PUT',
      { photoId: ids[0] },
    );
    onNotice(
      result.ok
        ? `Home cover of ${city.province} saved`
        : (COVER_ERRORS[result.error ?? ''] ?? result.error ?? 'Not saved'),
    );
    setBusy(false);
  }

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={trip === ''}
          className={`${button} aria-pressed:!border-primary aria-pressed:text-primary`}
          onClick={() => setTrip('')}
        >
          All Trips · {photos.length}
        </button>
        {trips.map((item) => (
          <button
            key={item.slug}
            type="button"
            aria-pressed={trip === item.slug}
            className={`${button} aria-pressed:!border-primary aria-pressed:text-primary`}
            onClick={() => setTrip(item.slug)}
          >
            {item.title} · {photos.filter((photo) => photo.trip.slug === item.slug).length}
          </button>
        ))}
        <button
          type="button"
          className={`${button} ml-auto`}
          onClick={() =>
            setSelected(
              shown.every((photo) => selected.has(photo.id))
                ? new Set()
                : new Set(shown.map((photo) => photo.id)),
            )
          }
        >
          {shown.length > 0 && shown.every((photo) => selected.has(photo.id))
            ? 'Select none'
            : 'Select all'}
        </button>
      </div>

      {ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border border-border p-3">
          <span className="text-sm">{ids.length} selected</span>
          <select
            className={field}
            aria-label="Move to City"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Move to City</option>
            {cities
              .filter((candidate) => candidate.id !== city.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.province})
                </option>
              ))}
          </select>
          <button
            type="button"
            className={button}
            disabled={busy || !target}
            onClick={() => void move({ cityId: Number(target) })}
          >
            Move
          </button>
          <select
            className={field}
            aria-label="Province of an On the way photo"
            value={onTheWayProvince}
            onChange={(event) => setOnTheWayProvince(event.target.value)}
          >
            <option value="">No Province</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              void move({
                onTheWay: true,
                ...(onTheWayProvince && { provinceId: Number(onTheWayProvince) }),
              })
            }
          >
            Mark On the way
          </button>
          {ids.length === 1 && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void makeCover()}
            >
              Set as {city.province} home cover
            </button>
          )}
        </div>
      )}

      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">No Photo of {city.name}.</p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {shown.map((photo) => (
          <li
            key={photo.id}
            className={`border p-1.5 ${selected.has(photo.id) ? 'border-primary' : 'border-border'}`}
          >
            <label className="flex cursor-pointer flex-col gap-1.5">
              <img
                src={photo.thumb}
                alt=""
                loading="lazy"
                className={`aspect-[3/2] w-full bg-surface ${photo.orientation === 'portrait' ? 'object-contain' : 'object-cover'}`}
              />
              <span className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.has(photo.id)}
                  aria-label={`Select ${photo.name}`}
                  onChange={() => toggle(photo.id)}
                />
                <span className="truncate">{photo.title ? `“${photo.title}”` : photo.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {photo.trip.title} · {photo.date}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

type DetailsProps = {
  city: AdminCityDetail;
  provinces: AdminProvince[];
  onNotice: (text: string) => void;
};

/** A City's name, Province, position and Major switch; Delete when nothing uses it. */
export function CityDetails({ city, provinces, onNotice }: DetailsProps) {
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState('');
  const inUse = city.photos + city.days + city.stays + city.activities;

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setWarning('');
    const result = await send<{
      ok: boolean;
      error?: string;
      city?: AdminCityDetail;
      clearedCovers?: string[];
    }>(`/api/admin/cities/${city.id}`, 'PATCH', {
      name: data.get('name'),
      nameZh: data.get('nameZh'),
      provinceId: Number(data.get('provinceId')),
      lng: Number(data.get('lng')),
      lat: Number(data.get('lat')),
      major: data.get('major') === 'on',
    });
    setBusy(false);
    if (!result.ok || !result.city) return onNotice(cityError(result.error ?? ''));
    const cleared = result.clearedCovers ?? [];
    if (cleared.length > 0) {
      setWarning(
        `The Province Cover of ${cleared.join(', ')} was a Photo of this City. It is cleared: the home map shows the first Photo of the Province.`,
      );
      onNotice(`${result.city.name} saved`);
      return;
    }
    // The tree, the map and the header show the City: reload them.
    window.location.reload();
  }

  async function remove() {
    if (!confirm(`Delete ${city.name} for good?`)) return;
    setBusy(true);
    const result = await send<{ ok: boolean; error?: string }>(
      `/api/admin/cities/${city.id}`,
      'DELETE',
    );
    if (result.ok) {
      window.location.href = `/admin/atlas?province=${encodeURIComponent(city.province)}`;
      return;
    }
    onNotice(cityError(result.error ?? ''));
    setBusy(false);
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {warning && (
        <p role="alert" className="border border-error p-4 text-sm text-error">
          {warning}
        </p>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <input
            name="name"
            required
            defaultValue={city.name}
            aria-label="Name"
            className={field}
          />
          <input
            name="nameZh"
            required
            defaultValue={city.nameZh}
            aria-label="Chinese name"
            className={field}
          />
        </div>
        <select
          name="provinceId"
          required
          defaultValue={city.provinceId}
          aria-label="Province"
          className={field}
        >
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="lng"
            required
            type="number"
            step="any"
            defaultValue={city.lng}
            aria-label="Longitude"
            className={field}
          />
          <input
            name="lat"
            required
            type="number"
            step="any"
            defaultValue={city.lat}
            aria-label="Latitude"
            className={field}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="major" type="checkbox" defaultChecked={city.major} /> Major City
        </label>
        <button type="submit" className={`${button} self-start`} disabled={busy}>
          Save
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        Used by {city.photos} Photos, {city.days} Days, {city.activities} Activities, {city.stays}{' '}
        hotels and restaurants.
      </p>
      <button
        type="button"
        className={`${button} self-start text-error`}
        disabled={busy || inUse > 0}
        onClick={() => void remove()}
      >
        Delete
      </button>
      {inUse > 0 && (
        <p className="text-sm text-muted-foreground">
          Move its Photos, Days and Activities to another City first.
        </p>
      )}
    </div>
  );
}
