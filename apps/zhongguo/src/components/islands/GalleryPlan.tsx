import { useEffect, useRef, useState } from 'react';
import type { AdminCityDetail, AdminPlanPhoto } from '@/lib/journal';
import { button, field, makeThumb, message, save } from './admin-form';
import { bandColours, CityPickMap, PhotoTile, uploadEach, useSelection } from './gallery-parts';
import { Toast } from './Toast';

type Props = { plan: { slug: string; title: string }; photos: AdminPlanPhoto[]; cities: AdminCityDetail[] };

/** The own Photos of a plan grouped by City: upload, City, title, delete. Which Plan Day shows them is set in the Journal. */
export function GalleryPlan({ plan, photos, cities }: Props) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const groups = [...new Set(photos.map((photo) => photo.city?.id ?? null))]
    .map((id) => ({ id, name: id === null ? 'No City' : photos.find((photo) => photo.city?.id === id)!.city!.name }))
    .sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : a.name.localeCompare(b.name)));
  const ordered = groups.flatMap((group) => photos.filter((photo) => (photo.city?.id ?? null) === group.id));
  const { selected, click } = useSelection(ordered.map((photo) => photo.id));
  const chosen = photos.filter((photo) => selected.has(photo.id));
  const colours = bandColours(groups.map((group) => group.id));
  const byId = new Map(cities.map((city) => [city.id, city]));
  const planProvinces = [...new Set(groups.flatMap((group) => (group.id === null ? [] : [byId.get(group.id)?.province ?? ''])))].filter(Boolean);

  const commonCity = new Set(chosen.map((photo) => photo.city?.id ?? null));
  const initialCity = commonCity.size === 1 ? String([...commonCity][0] ?? '') : 'mixed';
  const initialTitle = chosen.length === 1 ? (chosen[0].title ?? '') : '';
  const [city, setCity] = useState(initialCity);
  const [title, setTitle] = useState(initialTitle);
  const selectionKey = [...selected].sort().join(',');
  useEffect(() => {
    setCity(initialCity);
    setTitle(initialTitle);
  }, [selectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(file: File, overwrite: boolean) {
    const form = new FormData();
    form.set('file', file, file.name);
    form.set('thumb', await makeThumb(file), `${file.name}.webp`);
    if (overwrite) form.set('overwrite', 'true');
    return (await fetch(`/api/admin/plans/${encodeURIComponent(plan.slug)}/photos`, { method: 'POST', body: form })).json() as Promise<{ ok: boolean; error?: string; photo?: { id: number } }>;
  }

  async function upload(files: File[]) {
    setBusy(true);
    const { failures } = await uploadEach(files, send, 'plan', (done) => setProgress(`${done} of ${files.length} uploaded`));
    if (failures.length === 0) return window.location.reload();
    setProgress('');
    setNotice(failures.map((failure) => failure.replace(/: (.*)$/, (_, error) => `: ${message(error)}`)).join('. '));
    setBusy(false);
  }

  /** The API edits one plan Photo per request. */
  async function apply() {
    const body: Record<string, unknown> = {};
    if (city !== 'mixed' && city !== initialCity) body.cityId = city === '' ? null : Number(city);
    if (chosen.length === 1 && title !== initialTitle) body.title = title;
    if (Object.keys(body).length === 0) return setNotice('Nothing changed');
    setBusy(true);
    for (const photo of chosen) {
      const result = await save('PATCH', `/api/admin/plan-photos/${photo.id}`, body);
      if (!result.ok) {
        setNotice(message(result.error));
        return setBusy(false);
      }
    }
    window.location.reload();
  }

  async function remove() {
    if (!window.confirm(`Delete ${chosen.length} Photo(s) for good? Their files are removed too.`)) return;
    setBusy(true);
    for (const photo of chosen) {
      const result = await save('DELETE', `/api/admin/plan-photos/${photo.id}`, {});
      if (!result.ok) {
        setNotice(`${photo.name}: ${message(result.error)}`);
        return setBusy(false);
      }
    }
    window.location.reload();
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="gallery-title" className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="gallery-title" className="font-serif text-3xl">{plan.title}</h1>
          <span className="border border-border px-2 py-0.5 text-xs">Plan · {photos.length} Photos</span>
          <button type="button" className={`${button} ml-2`} disabled={busy} onClick={() => fileInput.current?.click()}>
            Upload to this plan
          </button>
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
        <p className="mt-2 text-sm text-muted-foreground">Plan Photos have no date: they are grouped by City.</p>

        <ul className="mt-4 border-t border-border">
          {groups.map((group) => {
            const run = photos.filter((photo) => (photo.city?.id ?? null) === group.id);
            const band = { label: group.name, colour: group.id === null ? null : colours.get(group.id)! };
            return (
              <li key={group.id ?? 'none'} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-border py-3">
                <div>
                  <p className={`font-serif text-lg ${group.id === null ? 'text-primary' : 'text-gold-ink'}`}>{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.length} {run.length === 1 ? 'Photo' : 'Photos'}
                  </p>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {run.map((photo, index) => (
                    <PhotoTile
                      key={photo.id}
                      thumb={photo.thumb}
                      name={photo.name}
                      portrait={photo.orientation === 'portrait'}
                      band={band}
                      showLabel={index === 0}
                      selected={selected.has(photo.id)}
                      onClick={(event) => click(photo.id, event)}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
          {photos.length === 0 && <li className="py-6 text-sm text-muted-foreground">No Photo yet: upload some.</li>}
        </ul>
      </section>

      <aside aria-labelledby="inspector-title" className="flex flex-col gap-4 border-border xl:sticky xl:top-4 xl:border-l xl:pl-6">
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
              provinces={planProvinces}
              cityId={city === '' || city === 'mixed' ? null : Number(city)}
              onPick={(cityId) => setCity(String(cityId))}
            />
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
              <label htmlFor="gallery-city" className="eyebrow text-muted-foreground">City</label>
              <select id="gallery-city" className={field} value={city} onChange={(event) => setCity(event.target.value)}>
                {city === 'mixed' && <option value="mixed">Mixed: unchanged</option>}
                <option value="">No City</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.nameZh} ({item.province})
                  </option>
                ))}
              </select>
              {chosen.length === 1 && (
                <>
                  <label htmlFor="gallery-title-field" className="eyebrow text-muted-foreground">Title</label>
                  <input id="gallery-title-field" className={field} placeholder="Optional" value={title} onChange={(event) => setTitle(event.target.value)} />
                </>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <button type="button" className="btn btn-primary cursor-pointer !px-4 !py-2" disabled={busy} onClick={() => void apply()}>
                Apply to {selected.size}
              </button>
              <button type="button" className={`${button} text-error`} disabled={busy} onClick={() => void remove()}>
                Delete
              </button>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Plan Days and order are set in the <a href={`/admin/plans/${plan.slug}`}>Journal</a>.
        </p>
      </aside>
    </div>
  );
}
