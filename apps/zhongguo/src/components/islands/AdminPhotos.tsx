import { useState } from 'react';
import { Camera } from 'lucide-react';
import type {
  AdminCity,
  AdminPhoto,
  AdminProvince,
  AdminTrip,
  DeletePhotosResult,
  KeptPhoto,
} from '@/lib/journal';
import { AddCityForm } from './AddCityForm';

type Props = {
  trips: AdminTrip[];
  tripSlug: string;
  photos: AdminPhoto[];
  cities: AdminCity[];
  provinces: AdminProvince[];
};

type Upload = { file: File; status: 'waiting' | 'sending' | 'done' | 'skipped' | 'failed'; error?: string };

const MESSAGES: Record<string, string> = {
  exists: 'A Photo with this name is already in the Trip',
  'breaks-cover': 'The new file breaks the orientation of a cover',
  'no-date': 'No date in the file or its name: fill the date field',
  unreadable: 'The file is not a readable image',
  'unsupported-type': 'Only .jpg, .jpeg, .png and .webp files',
  'invalid-name': 'Invalid file name',
  'unknown-trip': 'Unknown Trip',
  'unknown-city': 'Unknown City',
  'unknown-province': 'Unknown Province',
  'unknown-photo': 'A selected Photo no longer exists: reload the page',
  'invalid-date': 'Invalid date',
};
const message = (error: string) => MESSAGES[error] ?? error;

/** A .webp thumbnail: 960 px wide for a landscape Photo, 480 px otherwise, never enlarged. */
async function makeThumb(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const width = Math.min(bitmap.width, bitmap.width > bitmap.height ? 960 : 480);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((bitmap.height * width) / bitmap.width);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser cannot make a thumbnail'))), 'image/webp', 0.8),
  );
}

async function request<T>(method: string, body: unknown): Promise<T> {
  const response = await fetch('/api/admin/photos', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

export function AdminPhotos(props: Props) {
  const { trips, tripSlug, provinces } = props;
  const [photos, setPhotos] = useState(props.photos);
  const [cities, setCities] = useState(props.cities);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [kept, setKept] = useState<KeptPhoto[]>([]);
  const [picks, setPicks] = useState<Record<string, number>>({});

  const [formDate, setFormDate] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCity, setFormCity] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const ids = [...selected];
  const single = ids.length === 1 ? photos.find((photo) => photo.id === ids[0]) : undefined;

  async function reload() {
    const response = await fetch(`/api/admin/photos?trip=${encodeURIComponent(tripSlug)}`);
    const fresh: AdminPhoto[] = await response.json();
    setPhotos(fresh);
    setSelected((current) => new Set(fresh.filter((photo) => current.has(photo.id)).map((photo) => photo.id)));
  }

  function patchUpload(file: File, patch: Partial<Upload>) {
    setUploads((current) => current.map((upload) => (upload.file === file ? { ...upload, ...patch } : upload)));
  }

  async function send(file: File, overwrite: boolean) {
    const form = new FormData();
    form.set('trip', tripSlug);
    form.set('file', file, file.name);
    form.set('thumb', await makeThumb(file), `${file.name}.webp`);
    if (formDate) form.set('date', formDate);
    if (formTitle) form.set('title', formTitle);
    if (formCity) form.set('cityId', formCity);
    if (overwrite) form.set('overwrite', 'true');
    const response = await fetch('/api/admin/photos', { method: 'POST', body: form });
    return (await response.json()) as { ok: boolean; error?: string };
  }

  /** One file per request, so a request stays under the Worker limits. */
  async function upload(files: File[]) {
    setBusy(true);
    setNotice('');
    setUploads(files.map((file) => ({ file, status: 'waiting' })));
    for (const file of files) {
      patchUpload(file, { status: 'sending' });
      try {
        let result = await send(file, false);
        if (!result.ok && result.error === 'exists') {
          if (!confirm(`"${file.name}" is already in this Trip. Replace it?`)) {
            patchUpload(file, { status: 'skipped' });
            continue;
          }
          result = await send(file, true);
        }
        patchUpload(file, result.ok ? { status: 'done' } : { status: 'failed', error: message(result.error ?? '') });
      } catch (error) {
        patchUpload(file, { status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' });
      }
    }
    await reload();
    setBusy(false);
  }

  async function edit(body: Record<string, unknown>) {
    setBusy(true);
    const result = await request<{ ok: boolean; error?: string; updated?: number }>('PATCH', { ids, ...body });
    setNotice(result.ok ? `${result.updated} Photo(s) updated` : message(result.error ?? ''));
    if (result.ok) await reload();
    setBusy(false);
  }

  async function remove(targets: number[], replacements: Record<string, number>) {
    setBusy(true);
    const result = await request<DeletePhotosResult>('DELETE', { ids: targets, replacements });
    setKept(result.kept);
    setPicks({});
    setNotice(
      result.kept.length > 0
        ? `${result.deleted.length} deleted. ${result.kept.length} kept: a cover needs a replacement.`
        : `${result.deleted.length} deleted`,
    );
    await reload();
    setBusy(false);
  }

  function confirmDelete() {
    if (confirm(`Delete ${ids.length} Photo(s) for good? Their files are removed too.`)) {
      setKept([]);
      void remove(ids, {});
    }
  }

  const cityOptions = cities.map((city) => (
    <option key={city.id} value={city.id}>
      {city.name} ({city.province})
    </option>
  ));
  const failed = uploads.filter((item) => item.status === 'failed');

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span id="trip-label" className="eyebrow text-muted-foreground">Trip</span>
          {(['report', 'plan'] as const).map((type) => {
            const group = trips.filter((trip) => trip.type === type);
            return (
              group.length > 0 && (
                <div key={type} role="group" aria-labelledby="trip-label" className="flex flex-wrap gap-2">
                  {group.map((trip) => (
                    <button
                      key={trip.slug}
                      type="button"
                      aria-current={trip.slug === tripSlug ? 'true' : undefined}
                      onClick={() => {
                        if (trip.slug !== tripSlug) window.location.search = `?trip=${encodeURIComponent(trip.slug)}`;
                      }}
                      className={`${button} !pb-[calc(0.5rem-2px)] !pt-[calc(0.5rem+2px)] aria-[current=true]:!border-primary aria-[current=true]:text-primary`}
                    >
                      <span className="inline-flex items-center gap-2 leading-none">
                        {trip.title} ·
                        <Camera aria-hidden="true" className="relative -top-[1.5px] size-4 shrink-0" />
                        <span className="leading-none" aria-label={`${trip.photos} ${trip.photos === 1 ? 'Photo' : 'Photos'}`}>{trip.photos}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )
            );
          })}
        </div>
      </div>

      <section aria-labelledby="upload-title" className="flex flex-col gap-4 border border-border p-6">
        <h2 id="upload-title" className="font-serif text-2xl">Upload</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-2">
            <span className="eyebrow text-muted-foreground">Date if the file has none</span>
            <input type="date" className={field} value={formDate} onChange={(event) => setFormDate(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="eyebrow text-muted-foreground">Title</span>
            <input className={field} value={formTitle} onChange={(event) => setFormTitle(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="eyebrow text-muted-foreground">City</span>
            <select className={field} value={formCity} onChange={(event) => setFormCity(event.target.value)}>
              <option value="">None</option>
              {cityOptions}
            </select>
          </label>
        </div>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          aria-label="Photos to upload"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) void upload(files);
          }}
        />
        {uploads.length > 0 && (
          <div>
            <p className="text-sm" role="status">
              {uploads.filter((item) => item.status !== 'waiting' && item.status !== 'sending').length} of {uploads.length} done
            </p>
            <ul className="mt-2 text-sm">
              {uploads.map((item) => (
                <li key={item.file.name} className={item.status === 'failed' ? 'text-error' : 'text-muted-foreground'}>
                  {item.file.name}: {item.status === 'failed' ? item.error : item.status}
                </li>
              ))}
            </ul>
            {failed.length > 0 && !busy && (
              <button type="button" className={`${button} mt-3`} onClick={() => void upload(failed.map((item) => item.file))}>
                Retry the {failed.length} failed
              </button>
            )}
          </div>
        )}
      </section>

      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}

      {kept.length > 0 && (
        <section aria-labelledby="kept-title" className="flex flex-col gap-4 border border-error p-6">
          <h2 id="kept-title" className="font-serif text-2xl">Covers to replace</h2>
          {kept.map((photo) => (
            <div key={photo.id}>
              <p className="font-medium">{photo.name}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {photo.covers.map((cover) => (
                  <li key={cover.key} className="flex flex-wrap items-center gap-3 text-sm">
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

      <section aria-labelledby="edit-title" className="flex flex-col gap-4 border border-border p-6">
        <h2 id="edit-title" className="font-serif text-2xl">{ids.length} selected</h2>
        <div className="flex flex-wrap items-end gap-3">
          <select className={field} aria-label="City" value={editCity} onChange={(event) => setEditCity(event.target.value)}>
            <option value="">City</option>
            {cityOptions}
          </select>
          <button type="button" className={button} disabled={busy || ids.length === 0 || !editCity} onClick={() => void edit({ place: { cityId: Number(editCity) } })}>
            Set City
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <select className={field} aria-label="Province of an On the way photo" value={editProvince} onChange={(event) => setEditProvince(event.target.value)}>
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
            disabled={busy || ids.length === 0}
            onClick={() => void edit({ place: { onTheWay: true, ...(editProvince && { provinceId: Number(editProvince) }) } })}
          >
            Mark On the way
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <input type="date" className={field} aria-label="Date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
          <button type="button" className={button} disabled={busy || ids.length === 0 || !editDate} onClick={() => void edit({ date: editDate })}>
            Set date
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <input
            className={field}
            aria-label="Title"
            placeholder={single?.title ?? 'Title'}
            value={editTitle}
            disabled={!single}
            onChange={(event) => setEditTitle(event.target.value)}
          />
          <button type="button" className={button} disabled={busy || !single} onClick={() => void edit({ title: editTitle })}>
            Save title (empty clears)
          </button>
        </div>
        <button type="button" className={`${button} self-start text-error`} disabled={busy || ids.length === 0} onClick={confirmDelete}>
          Delete
        </button>
      </section>

      <section aria-labelledby="photos-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="photos-title" className="font-serif text-2xl">{photos.length} Photos</h2>
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
                <img src={photo.thumb} alt="" loading="lazy" className="aspect-[4/3] w-full bg-surface object-cover" />
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
                  {photo.date} · {photo.day === null ? 'no Day' : `Day ${photo.day}`}
                  <br />
                  {photo.onTheWay ? `On the way${photo.province ? `, ${photo.province}` : ''}` : `${photo.city?.name}, ${photo.province}`}
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
      </section>

      <AddCityForm
        provinces={provinces}
        onAdded={(city) => {
          setCities((current) => [...current, city].sort((a, b) => a.name.localeCompare(b.name)));
          setNotice(`${city.name} added`);
        }}
        onError={setNotice}
      />
    </div>
  );
}
