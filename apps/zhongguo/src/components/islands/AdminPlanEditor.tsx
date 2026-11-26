import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import type { AdminCity, AdminPlanDay, AdminPlanDetail, AdminPlanPhoto } from '@/lib/journal';
import { DayText } from './DayText';
import { Cover, Highlights, PhotoBoard } from './PhotoPicks';
import { button, field, makeThumb, message, save } from './admin-form';
import { Toast } from './Toast';

type Props = { plan: AdminPlanDetail; cities: AdminCity[] };

/** The Photos of the plan: upload, City of each, delete. The page reloads after an upload or a delete. */
function Photos({ plan, cities, onNotice }: { plan: AdminPlanDetail; cities: AdminCity[]; onNotice: (text: string) => void }) {
  const [photos, setPhotos] = useState(plan.photos);
  const [busy, setBusy] = useState(false);
  const url = `/api/admin/plans/${encodeURIComponent(plan.slug)}/photos`;

  async function send(file: File, overwrite: boolean) {
    const form = new FormData();
    form.set('file', file, file.name);
    form.set('thumb', await makeThumb(file), `${file.name}.webp`);
    if (overwrite) form.set('overwrite', 'true');
    return (await (await fetch(url, { method: 'POST', body: form })).json()) as { ok: boolean; error?: string };
  }

  /** One file per request, so a request stays under the Worker limits. */
  async function upload(files: File[]) {
    setBusy(true);
    const failures: string[] = [];
    for (const file of files) {
      try {
        let result = await send(file, false);
        if (!result.ok && result.error === 'exists') {
          if (!window.confirm(`"${file.name}" is already in this plan. Replace it?`)) continue;
          result = await send(file, true);
        }
        if (!result.ok) failures.push(`${file.name}: ${message(result.error)}`);
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
    }
    if (failures.length === 0) return window.location.reload();
    onNotice(failures.join('. '));
    setBusy(false);
  }

  async function setCity(photo: AdminPlanPhoto, value: string) {
    const city = cities.find((candidate) => String(candidate.id) === value);
    const result = await save('PATCH', `/api/admin/plan-photos/${photo.id}`, { cityId: city ? city.id : null });
    if (!result.ok) return onNotice(message(result.error));
    setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, city: city ? { id: city.id, name: city.name } : null } : item)));
    onNotice('City saved');
  }

  async function remove(photo: AdminPlanPhoto) {
    if (!window.confirm(`Delete ${photo.name} for good? Its files are removed too.`)) return;
    const result = await save('DELETE', `/api/admin/plan-photos/${photo.id}`, {});
    if (result.ok) return window.location.reload();
    onNotice(message(result.error));
  }

  return (
    <section aria-labelledby="photos-title" className="flex flex-col gap-4">
      <h2 id="photos-title" className="font-serif text-2xl">Photos</h2>
      <label className="flex flex-col gap-1 text-sm">
        Upload Photos
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className={field}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) void upload(files);
          }}
        />
      </label>
      {busy && <p role="status" className="text-sm text-muted-foreground">Uploading…</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {photos.map((photo) => (
          <li key={photo.id} className="flex flex-col gap-2 border border-border p-3">
            <img src={photo.thumb} alt={photo.name} loading="lazy" className="aspect-[4/3] w-full bg-surface object-cover" />
            <p className="truncate text-xs text-muted-foreground">{photo.name}</p>
            <select
              aria-label={`City of ${photo.name}`}
              value={photo.city?.id ?? ''}
              onChange={(event) => void setCity(photo, event.target.value)}
              className={field}
            >
              <option value="">No City</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.province}
                </option>
              ))}
            </select>
            <button type="button" className={button} aria-label={`Delete ${photo.name}`} onClick={() => void remove(photo)}>
              Delete
            </button>
          </li>
        ))}
        {photos.length === 0 && <li className="text-sm text-muted-foreground">No Photo yet</li>}
      </ul>
    </section>
  );
}

/** The numbered Days of a plan: edit, move, delete, and add one at the end. The page reloads after a change of order. */
export function AdminPlanEditor({ plan, cities }: Props) {
  const [days, setDays] = useState(plan.days);
  const [notice, setNotice] = useState('');
  const [cityId, setCityId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/admin/plans/${encodeURIComponent(plan.slug)}`;

  const patchDay = (id: number, patch: Partial<AdminPlanDay>) =>
    setDays((current) => current.map((day) => (day.id === id ? { ...day, ...patch } : day)));

  async function move(day: AdminPlanDay, direction: 'up' | 'down') {
    const result = await save('PATCH', `/api/admin/plan-days/${day.id}`, { move: direction });
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
  }

  async function remove(day: AdminPlanDay) {
    if (!window.confirm(`Delete Day ${day.number}, ${day.title}?`)) return;
    const result = await save('DELETE', `/api/admin/plan-days/${day.id}`, {});
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
  }

  async function add(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await save('POST', `/api/admin/plans/${encodeURIComponent(plan.slug)}/days`, { cityId: Number(cityId), title, notes });
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <Photos plan={plan} cities={cities} onNotice={setNotice} />
      <Cover base={base} label="Plan cover" photos={plan.photos} coverId={plan.coverId} coverFocus={plan.coverFocus} onNotice={setNotice} />
      <Highlights base={base} photos={plan.photos} highlightIds={plan.highlightIds} onNotice={setNotice} />
      <section aria-labelledby="add-day-title" className="flex flex-col gap-4">
        <h2 id="add-day-title" className="font-serif text-2xl">Add Day</h2>
        <form onSubmit={(event) => void add(event)} className="flex flex-col gap-3 border border-border p-6">
          <label className="flex flex-col gap-1 text-sm">
            Main City
            <select required value={cityId} onChange={(event) => setCityId(event.target.value)} className={field}>
              <option value="">Choose a City</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.province}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input type="text" required value={title} onChange={(event) => setTitle(event.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className={field} />
          </label>
          <div>
            <button type="submit" className={button} disabled={busy}>
              Add Day
            </button>
          </div>
        </form>
      </section>
      {days.length > 0 && (
        <section aria-labelledby="days-title" className="flex flex-col gap-6">
          <h2 id="days-title" className="font-serif text-2xl">Days</h2>
          <PhotoBoard photos={plan.photos} days={plan.days} daysUrl="/api/admin/plan-days" onNotice={setNotice}>
            {(list) =>
              days.map((day, index) => (
                <article key={day.id} className="flex flex-col gap-4 border border-border bg-background p-6">
                  <DayText
                    day={day}
                    heading={`Day ${day.number} · ${(day.route.length > 0 ? day.route : [day.city]).map((city) => city.name).join(' → ')}, ${day.province}`}
                    label={`Day ${day.number}`}
                    url={`/api/admin/plan-days/${day.id}`}
                    cities={cities}
                    onChange={(patch) => patchDay(day.id, patch)}
                    onNotice={setNotice}
                    actions={
                      <>
                        <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Move Day ${day.number} up`} disabled={index === 0} onClick={() => void move(day, 'up')}>
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Move Day ${day.number} down`} disabled={index === days.length - 1} onClick={() => void move(day, 'down')}>
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Delete Day ${day.number}`} onClick={() => void remove(day)}>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </>
                    }
                  />
                  {list(day.id, `Photos of Day ${day.number}`)}
                </article>
              ))
            }
          </PhotoBoard>
        </section>
      )}
    </div>
  );
}
