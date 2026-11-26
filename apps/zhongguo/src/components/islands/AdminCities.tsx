import { useState } from 'react';
import type { AdminActivity, AdminCityDetail, AdminProvince, CityPhoto } from '@/lib/journal';
import { ActivitiesPanel } from './ActivitiesPanel';
import { ChinaMap, type ChinaMapCity } from './ChinaMap';
import { projectLngLat } from '@/lib/china-map';
import { AddCityForm, cityError, fieldClass as field } from './AddCityForm';
import { Toast } from './Toast';

type Props = {
  cities: AdminCityDetail[];
  cityId: number;
  photos: CityPhoto[];
  provinces: AdminProvince[];
  activities: AdminActivity[];
};

const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json();
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** The Cities admin: one City at a time, with its Photos from every Trip. */
export function AdminCities(props: Props) {
  const { cityId, provinces } = props;
  const [cities, setCities] = useState(props.cities);
  const [photos, setPhotos] = useState(props.photos);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState('');
  const [onTheWayProvince, setOnTheWayProvince] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');

  const city = cities.find((candidate) => candidate.id === cityId);
  const ids = [...selected];

  async function reload() {
    const [fresh, list] = await Promise.all([
      send<CityPhoto[]>(`/api/admin/cities/${cityId}`, 'GET'),
      send<{ ok: true; cities: AdminCityDetail[] }>('/api/admin/cities', 'GET'),
    ]);
    setPhotos(fresh);
    setCities(list.cities);
    setSelected((current) => new Set(fresh.filter((photo) => current.has(photo.id)).map((photo) => photo.id)));
  }

  async function move(place: unknown) {
    setBusy(true);
    setWarning('');
    const result = await send<{ ok: boolean; error?: string; updated?: number }>('/api/admin/photos', 'PATCH', { ids, place });
    setNotice(result.ok ? `${result.updated} Photo(s) moved` : cityError(result.error ?? ''));
    if (result.ok) await reload();
    setBusy(false);
  }

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setWarning('');
    const result = await send<{ ok: boolean; error?: string; city?: AdminCityDetail; clearedCovers?: string[] }>(
      `/api/admin/cities/${cityId}`,
      'PATCH',
      {
        name: data.get('name'),
        nameZh: data.get('nameZh'),
        provinceId: Number(data.get('provinceId')),
        lng: Number(data.get('lng')),
        lat: Number(data.get('lat')),
        major: data.get('major') === 'on',
      },
    );
    if (result.ok && result.city) {
      setCities((list) => list.map((item) => (item.id === cityId ? result.city! : item)).sort(byName));
      setNotice(`${result.city.name} saved`);
      const cleared = result.clearedCovers ?? [];
      if (cleared.length > 0) {
        setWarning(`The Province Cover of ${cleared.join(', ')} was a Photo of this City. It is cleared: the home map shows the first Photo of the Province.`);
      }
      await reload();
    } else {
      setNotice(cityError(result.error ?? ''));
    }
    setBusy(false);
  }

  async function remove() {
    if (!city || !confirm(`Delete ${city.name} for good?`)) return;
    setBusy(true);
    const result = await send<{ ok: boolean; error?: string }>(`/api/admin/cities/${cityId}`, 'DELETE');
    if (result.ok) {
      window.location.href = '/admin/cities';
      return;
    }
    setNotice(cityError(result.error ?? ''));
    setBusy(false);
  }

  const cityOptions = cities
    .filter((candidate) => candidate.id !== cityId)
    .map((candidate) => (
      <option key={candidate.id} value={candidate.id}>
        {candidate.name} ({candidate.province})
      </option>
    ));
  const selectCity = (id: string) => (window.location.search = `?city=${id}`);
  const mapCities: ChinaMapCity[] = cities.map((item) => {
    const [x, y] = projectLngLat(item.lng, item.lat);
    return { key: String(item.id), name: item.name, zh: item.nameZh, x, y, major: item.major, province: item.province };
  });
  const inUse = city ? city.photos + city.days + city.stays + city.activities : 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="eyebrow text-muted-foreground">City</span>
            <select className={field} value={cityId} onChange={(event) => selectCity(event.target.value)}>
              {cities.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.province}) · {candidate.photos} Photos
                </option>
              ))}
            </select>
          </label>

          <Toast text={notice} onDone={() => setNotice('')} />
          {warning && (
            <p role="alert" className="border border-error p-4 text-sm text-error">
              {warning}
            </p>
          )}

          {city && (
            <section aria-labelledby="city-title" className="flex flex-col gap-4 border border-border p-6">
              <h2 id="city-title" className="font-serif text-2xl">
                {city.name} <span lang="zh">{city.nameZh}</span>
              </h2>
              <form
                key={`${city.id}-${city.name}-${city.provinceId}`}
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save(event.currentTarget);
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <input name="name" required defaultValue={city.name} aria-label="Name" className={field} />
                  <input name="nameZh" required defaultValue={city.nameZh} aria-label="Chinese name" className={field} />
                </div>
                <select name="provinceId" required defaultValue={city.provinceId} aria-label="Province" className={field}>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input name="lng" required type="number" step="any" defaultValue={city.lng} aria-label="Longitude" className={field} />
                  <input name="lat" required type="number" step="any" defaultValue={city.lat} aria-label="Latitude" className={field} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input name="major" type="checkbox" defaultChecked={city.major} /> Major City
                </label>
                <button type="submit" className={`${button} self-start`} disabled={busy}>
                  Save
                </button>
              </form>
              <p className="text-sm text-muted-foreground">
                Used by {city.photos} Photos, {city.days} Days, {city.activities} Activities, {city.stays} hotels and restaurants.
              </p>
              <button type="button" className={`${button} self-start text-error`} disabled={busy || inUse > 0} onClick={() => void remove()}>
                Delete
              </button>
              {inUse > 0 && <p className="text-sm text-muted-foreground">Move its Photos and Days to another City first.</p>}
            </section>
          )}
        </div>
        <div className="w-full min-w-0">
          <ChinaMap regions={[]} cities={mapCities} selectedCity={String(cityId)} onSelectCity={selectCity} preview={false} />
        </div>
      </div>

      {city && (
        <section aria-label="Activities" className="border border-border p-6">
          <details>
            <summary className="cursor-pointer font-serif text-2xl">Activities</summary>
            <div className="mt-4">
              <ActivitiesPanel
                activities={props.activities}
                cities={cities}
                inScope={(activity) => activity.cityId === city.id}
                cityId={city.id}
                onNotice={setNotice}
              />
            </div>
          </details>
        </section>
      )}

      {city && (
        <section aria-label="Photos" className="border border-border p-6">
      <details>
        <summary className="cursor-pointer font-serif text-2xl">Photos</summary>
        <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl">{photos.length} Photos</h3>
          {ids.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <select className={field} aria-label="Move to City" value={target} onChange={(event) => setTarget(event.target.value)}>
                <option value="">Move to City</option>
                {cityOptions}
              </select>
              <button type="button" className={button} disabled={busy || !target} onClick={() => void move({ cityId: Number(target) })}>
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
                onClick={() => void move({ onTheWay: true, ...(onTheWayProvince && { provinceId: Number(onTheWayProvince) }) })}
              >
                Mark On the way
              </button>
            </div>
          )}
          <button
            type="button"
            className={button}
            onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((photo) => photo.id)))}
          >
            {selected.size === photos.length && photos.length > 0 ? 'Select none' : 'Select all'}
          </button>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo) => (
            <li key={photo.id} className={`border p-2 ${selected.has(photo.id) ? 'border-primary' : 'border-border'}`}>
              <label className="flex cursor-pointer flex-col gap-2">
                <img src={photo.thumb} alt="" loading="lazy" className={`aspect-[4/3] w-full bg-surface object-center ${photo.orientation === 'portrait' ? 'object-contain' : 'object-cover'}`} />
                <span className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(photo.id)}
                    aria-label={`Select ${photo.name}`}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (!next.delete(photo.id)) next.add(photo.id);
                        return next;
                      })
                    }
                  />
                  <span className="truncate font-medium">{photo.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {photo.trip.title}
                  <br />
                  {photo.date}
                  {photo.title && (
                    <>
                      <br />“{photo.title}”
                    </>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        </div>
      </details>

        </section>
      )}

      <AddCityForm
        provinces={provinces}
        onAdded={(added) => {
          void reload();
          setNotice(`${added.name} added`);
        }}
        onError={setNotice}
      />
    </div>
  );
}
