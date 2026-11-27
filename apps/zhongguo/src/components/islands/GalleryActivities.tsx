import { useEffect, useState } from 'react';
import type { AdminActivity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';
import { button, field, makeThumb } from './admin-form';
import { bandColours, PhotoTile, useOpenSet } from './gallery-parts';
import { Toast } from './Toast';

type Props = { province: string; activities: AdminActivity[] };

const MESSAGES: Record<string, string> = {
  'invalid-name': 'The file name is not valid',
  'unsupported-type': 'Only .jpg, .jpeg, .png and .webp files',
  unreadable: 'The file is not a readable image',
  exists: 'The other Activity already has a picture with this name',
  'unknown-activity': 'The Activity no longer exists: reload the page',
  'unknown-picture': 'The picture no longer exists: reload the page',
};
const message = (error = '') => MESSAGES[error] ?? error ?? 'The request failed';
const label = (list: readonly { value: string; label: string }[], value: string | null) =>
  list.find((item) => item.value === value)?.label ?? '';

type Result = {
  ok: boolean;
  error?: string;
  activity?: AdminActivity;
  from?: AdminActivity;
  to?: AdminActivity;
};

async function call(method: string, url: string, body: unknown): Promise<Result> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return { ok: false, error: 'The request failed' };
  }
}

/** The pictures of the Activities of one Province, by City: upload, order (the first is the main one), move, delete. */
export function GalleryActivities({ province, ...props }: Props) {
  const [activities, setActivities] = useState(props.activities);
  const [selected, setSelected] = useState<number | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const accordion = useOpenSet(`gallery:activities:${province}`);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cities = [...new Set(activities.map((activity) => activity.city))].sort((a, b) =>
    a.localeCompare(b),
  );
  const colours = bandColours(cities.map((_, index) => index));
  const owner = activities.find((activity) =>
    activity.pictures.some((picture) => picture.id === selected),
  );
  const index = owner?.pictures.findIndex((picture) => picture.id === selected) ?? -1;
  const picture = owner?.pictures[index];
  const total = activities.reduce((sum, activity) => sum + activity.pictures.length, 0);

  const replace = (...fresh: (AdminActivity | undefined)[]) =>
    setActivities((current) =>
      current.map((activity) => fresh.find((item) => item?.id === activity.id) ?? activity),
    );

  async function upload(activity: AdminActivity, files: File[]) {
    setBusy(true);
    const failures: string[] = [];
    for (const file of files) {
      const send = async (overwrite: boolean) => {
        const form = new FormData();
        form.set('activityId', String(activity.id));
        form.set('file', file, file.name);
        form.set('thumb', await makeThumb(file), `${file.name}.webp`);
        if (overwrite) form.set('overwrite', 'true');
        return (await (
          await fetch('/api/admin/activities/pictures', { method: 'POST', body: form })
        ).json()) as Result;
      };
      try {
        let result = await send(false);
        if (
          !result.ok &&
          result.error === 'exists' &&
          window.confirm(`"${file.name}" is already here. Replace it?`)
        )
          result = await send(true);
        if (result.ok) replace(result.activity);
        else if (result.error !== 'exists') failures.push(`${file.name}: ${message(result.error)}`);
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
    }
    setNotice(
      failures.length > 0 ? failures.join('. ') : `${files.length} uploaded to ${activity.name}`,
    );
    setBusy(false);
  }

  async function run(request: Promise<Result>, done: string) {
    setBusy(true);
    const result = await request;
    if (result.ok) {
      replace(result.activity, result.from, result.to);
      setNotice(done);
    } else {
      setNotice(message(result.error));
    }
    setBusy(false);
    return result.ok;
  }

  function reorder(to: number) {
    if (!owner || !picture) return;
    const ids = owner.pictures.map((item) => item.id).filter((id) => id !== picture.id);
    ids.splice(to, 0, picture.id);
    void run(
      call('PATCH', '/api/admin/activities/pictures', { activityId: owner.id, pictureIds: ids }),
      to === 0 ? 'Main picture set' : 'Order saved',
    );
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="gallery-title" className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="gallery-title" className="font-serif text-3xl">
            {province}
          </h1>
          <span className="border border-border px-2 py-0.5 text-xs">
            Activity pictures · {total}
          </span>
          <span className="ml-auto flex gap-4 text-xs">
            <button
              type="button"
              className="cursor-pointer text-muted-foreground hover:text-primary"
              onClick={() => accordion.setAll(cities)}
            >
              Expand all
            </button>
            <button
              type="button"
              className="cursor-pointer text-muted-foreground hover:text-primary"
              onClick={() => accordion.setAll([])}
            >
              Collapse all
            </button>
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The first picture of an Activity is its main one, shown on Plan Days.
        </p>

        <ul className="mt-4 border-t border-border">
          {cities.map((city, cityIndex) => {
            const ofCity = activities.filter((activity) => activity.city === city);
            const open = accordion.open.has(city);
            const colour = colours.get(cityIndex)!;
            return (
              <li key={city} className="border-b border-border">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => accordion.toggle(city)}
                  className="flex w-full cursor-pointer items-baseline gap-3 py-2.5 text-left"
                >
                  <span aria-hidden="true" className="w-3 text-xs text-muted-foreground">
                    {open ? '▾' : '▸'}
                  </span>
                  <span className="font-serif text-lg" style={{ color: colour }}>
                    {city}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ofCity.length} {ofCity.length === 1 ? 'Activity' : 'Activities'} ·{' '}
                    {ofCity.reduce((sum, activity) => sum + activity.pictures.length, 0)} pictures
                  </span>
                </button>
                {open && (
                  <ul className="pb-2 pl-6">
                    {ofCity.map((activity) => (
                      <li
                        key={activity.id}
                        className="grid grid-cols-[11rem_minmax(0,1fr)] gap-3 py-2"
                      >
                        <div>
                          <p className="font-serif text-base text-gold-ink">{activity.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {label(ACTIVITY_KINDS, activity.kind)}
                            {activity.rating && ` · ${label(ACTIVITY_RATINGS, activity.rating)}`}
                          </p>
                        </div>
                        <ul className="flex flex-wrap items-start gap-1.5">
                          {activity.pictures.map((item, position) => (
                            <PhotoTile
                              key={item.id}
                              thumb={item.thumb}
                              name={item.name}
                              portrait={false}
                              band={{ label: position === 0 ? 'Main' : '', colour }}
                              showLabel={position === 0}
                              selected={item.id === selected}
                              onClick={() => setSelected(item.id === selected ? null : item.id)}
                            />
                          ))}
                          <li>
                            <label className="grid h-16 w-16 cursor-pointer place-items-center border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary">
                              + Add
                              <input
                                type="file"
                                multiple
                                hidden
                                disabled={busy}
                                accept=".jpg,.jpeg,.png,.webp"
                                aria-label={`Add pictures to ${activity.name}`}
                                onChange={(event) => {
                                  const files = [...(event.currentTarget.files ?? [])];
                                  event.currentTarget.value = '';
                                  if (files.length > 0) void upload(activity, files);
                                }}
                              />
                            </label>
                          </li>
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {activities.length === 0 && (
            <li className="py-6 text-sm text-muted-foreground">
              This Province has no Activity yet: add one in the Atlas.
            </li>
          )}
        </ul>
      </section>

      <aside
        aria-labelledby="inspector-title"
        className="flex flex-col gap-4 border-border xl:sticky xl:top-4 xl:border-l xl:pl-6"
      >
        <Toast text={notice} onDone={() => setNotice('')} />
        {!owner || !picture ? (
          <>
            <h2 id="inspector-title" className="font-serif text-2xl">
              No picture selected
            </h2>
            <p className="text-sm text-muted-foreground">
              Click a picture to order, move or delete it. "+ Add" uploads to that Activity.
            </p>
          </>
        ) : (
          <>
            <div>
              <h2 id="inspector-title" className="font-serif text-2xl">
                {owner.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                <span lang="zh">{owner.nameZh}</span> · {owner.city} · picture {index + 1} of{' '}
                {owner.pictures.length}
              </p>
            </div>
            <img
              src={picture.thumb}
              alt={picture.name}
              className="w-full bg-surface object-contain"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                disabled={busy || index === 0}
                onClick={() => reorder(0)}
              >
                Make main
              </button>
              <button
                type="button"
                className={button}
                aria-label="Move earlier"
                disabled={busy || index === 0}
                onClick={() => reorder(index - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className={button}
                aria-label="Move later"
                disabled={busy || index === owner.pictures.length - 1}
                onClick={() => reorder(index + 1)}
              >
                →
              </button>
            </div>
            <div className="flex gap-2">
              <select
                className={`${field} min-w-0 flex-1`}
                aria-label="Move to Activity"
                value={moveTo}
                onChange={(event) => setMoveTo(event.target.value)}
              >
                <option value="">Move to Activity…</option>
                {activities
                  .filter((activity) => activity.id !== owner.id)
                  .map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name} ({activity.city})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className={button}
                disabled={busy || !moveTo}
                onClick={async () => {
                  const target = activities.find((activity) => String(activity.id) === moveTo);
                  if (
                    await run(
                      call('POST', '/api/admin/activities/picture-move', {
                        pictureId: picture.id,
                        activityId: Number(moveTo),
                      }),
                      `Moved to ${target?.name}`,
                    )
                  ) {
                    setMoveTo('');
                  }
                }}
              >
                Move
              </button>
            </div>
            <div className="flex justify-between gap-2">
              <a
                className={`${button} no-underline`}
                href={`/admin/atlas?city=${owner.cityId}&tab=activities`}
              >
                Open in Atlas
              </a>
              <button
                type="button"
                className={`${button} text-error`}
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(`Delete ${picture.name} for good?`)) return;
                  if (
                    await run(
                      call('DELETE', '/api/admin/activities/pictures', { pictureId: picture.id }),
                      'Picture deleted',
                    )
                  )
                    setSelected(null);
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
