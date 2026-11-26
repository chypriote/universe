import { useState } from 'react';
import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';

const ERRORS: Record<string, string> = {
  'invalid-name': 'A name, a Chinese name and a pinyin are needed',
  'invalid-kind': 'Pick a kind',
  'invalid-rating': 'Invalid rating',
  'invalid-price': 'The price is a whole number of yuan',
  'invalid-position': 'Latitude and longitude must come together, in range',
  'unknown-city': 'Unknown City: reload the page',
  'unknown-activity': 'The Activity no longer exists: reload the page',
  'name-taken': 'This City has an Activity with this name',
  'in-use': 'A Day or a Plan Day still lists this Activity',
};

export const activityError = (error: string) => ERRORS[error] ?? error;

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

type Props = {
  cities: AdminCity[];
  /** The Activity to edit; without it the form adds one. */
  activity?: AdminActivity;
  /** The City picked when adding. */
  cityId?: number;
  onSaved: (activity: AdminActivity) => void;
  onError: (message: string) => void;
};

const number = (value: FormDataEntryValue | null) => (String(value ?? '').trim() === '' ? null : Number(value));

/** The Activity form: adds one, or edits one. Shared by the Activities, City and Province pages. */
export function ActivityForm({ cities, activity, cityId, onSaved, onError }: Props) {
  const [busy, setBusy] = useState(false);

  /** Fills latitude and longitude from OpenStreetMap Nominatim (free, one request per click). */
  async function lookUp(form: HTMLFormElement) {
    const data = new FormData(form);
    const city = cities.find((candidate) => candidate.id === Number(data.get('cityId')));
    const place = String(data.get('address') || data.get('name') || '').trim();
    if (!place) return onError('Enter the name or the address first');
    setBusy(true);
    try {
      const query = [place, city?.name, 'China'].filter(Boolean).join(', ');
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
      const [found] = (await response.json()) as { lat: string; lon: string }[];
      if (!found) return onError('No place found');
      (form.elements.namedItem('lat') as HTMLInputElement).value = Number(found.lat).toFixed(5);
      (form.elements.namedItem('lng') as HTMLInputElement).value = Number(found.lon).toFixed(5);
    } catch {
      onError('Coordinate lookup failed');
    } finally {
      setBusy(false);
    }
  }

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    try {
      const response = await fetch(activity ? `/api/admin/activities/${activity.id}` : '/api/admin/activities', {
        method: activity ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          nameZh: data.get('nameZh'),
          pinyin: data.get('pinyin'),
          cityId: Number(data.get('cityId')),
          kind: data.get('kind'),
          description: data.get('description'),
          address: data.get('address'),
          addressZh: data.get('addressZh'),
          lat: number(data.get('lat')),
          lng: number(data.get('lng')),
          rating: data.get('rating') || null,
          price: number(data.get('price')),
        }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string; activity?: AdminActivity };
      if (result.ok && result.activity) {
        onSaved(result.activity);
        if (!activity) form.reset();
      } else {
        onError(activityError(result.error ?? ''));
      }
    } catch {
      onError('The request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="name" required defaultValue={activity?.name} placeholder="Name" aria-label="Name" className={field} />
        <input name="nameZh" required defaultValue={activity?.nameZh} placeholder="中文名" aria-label="Chinese name" className={field} />
        <input name="pinyin" required defaultValue={activity?.pinyin} placeholder="Pinyin" aria-label="Pinyin" className={field} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <select name="cityId" required defaultValue={activity?.cityId ?? cityId ?? ''} aria-label="City" className={field}>
          <option value="" disabled>
            City
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} ({city.province})
            </option>
          ))}
        </select>
        <select name="kind" required defaultValue={activity?.kind ?? ''} aria-label="Kind" className={field}>
          <option value="" disabled>
            Kind
          </option>
          {ACTIVITY_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
        <select name="rating" defaultValue={activity?.rating ?? ''} aria-label="Rating" className={field}>
          <option value="">No rating</option>
          {ACTIVITY_RATINGS.map((rating) => (
            <option key={rating.value} value={rating.value}>
              {rating.label}
            </option>
          ))}
        </select>
        <input name="price" type="number" min="0" step="1" defaultValue={activity?.price ?? ''} placeholder="Price, yuan per person" aria-label="Price in yuan per person" className={field} />
      </div>
      <textarea name="description" rows={2} defaultValue={activity?.description} placeholder="Description" aria-label="Description" className={field} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="address" defaultValue={activity?.address} placeholder="Address" aria-label="Address" className={field} />
        <input name="addressZh" defaultValue={activity?.addressZh} placeholder="中文地址 (to show a driver)" aria-label="Chinese address" className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input name="lat" type="number" step="any" defaultValue={activity?.lat ?? ''} placeholder="Latitude" aria-label="Latitude" className={field} />
        <input name="lng" type="number" step="any" defaultValue={activity?.lng ?? ''} placeholder="Longitude" aria-label="Longitude" className={field} />
        <button type="button" disabled={busy} className={button} onClick={(event) => void lookUp(event.currentTarget.form!)}>
          Look up
        </button>
        <button type="submit" disabled={busy} className={button}>
          {activity ? 'Save' : 'Add Activity'}
        </button>
      </div>
    </form>
  );
}
