import { useState } from 'react';
import type { AdminActivity } from '@/lib/journal';
import { makeThumb } from './admin-form';

const MESSAGES: Record<string, string> = {
  'invalid-name': 'The file name is not valid',
  'unsupported-type': 'Only .jpg, .jpeg, .png and .webp files',
  unreadable: 'The file is not a readable image',
  'unknown-activity': 'The Activity no longer exists: reload the page',
  'unknown-picture': 'The picture no longer exists: reload the page',
};

const button = 'btn btn-outline cursor-pointer !px-3 !py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40';

type Props = {
  activity: AdminActivity;
  onSaved: (activity: AdminActivity) => void;
  onError: (message: string) => void;
};

/** An Activity's own pictures: upload, order (the first is the main one) and delete. */
export function ActivityPictures({ activity, onSaved, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const { pictures } = activity;

  async function call(request: Promise<Response>) {
    setBusy(true);
    try {
      const result = (await (await request).json()) as { ok: boolean; error?: string; activity?: AdminActivity };
      if (result.ok && result.activity) onSaved(result.activity);
      else onError(MESSAGES[result.error ?? ''] ?? result.error ?? 'The request failed');
    } catch {
      onError('The request failed');
    } finally {
      setBusy(false);
    }
  }

  async function send(file: File, overwrite: boolean) {
    const form = new FormData();
    form.set('activityId', String(activity.id));
    form.set('file', file, file.name);
    form.set('thumb', await makeThumb(file), `${file.name}.webp`);
    if (overwrite) form.set('overwrite', 'true');
    const response = await fetch('/api/admin/activities/pictures', { method: 'POST', body: form });
    return (await response.json()) as { ok: boolean; error?: string; activity?: AdminActivity };
  }

  /** One file per request, so a request stays under the Worker limits. */
  async function upload(files: File[]) {
    setBusy(true);
    try {
      for (const file of files) {
        let result = await send(file, false);
        if (!result.ok && result.error === 'exists') {
          if (!confirm(`"${file.name}" is already here. Replace it?`)) continue;
          result = await send(file, true);
        }
        if (result.ok && result.activity) onSaved(result.activity);
        else onError(`${file.name}: ${MESSAGES[result.error ?? ''] ?? result.error ?? 'failed'}`);
      }
    } catch {
      onError('The upload failed');
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, by: number) {
    const ids = pictures.map((picture) => picture.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    void call(
      fetch('/api/admin/activities/pictures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id, pictureIds: ids }),
      }),
    );
  }

  function remove(pictureId: number, name: string) {
    if (!confirm(`Delete ${name} for good?`)) return;
    void call(
      fetch('/api/admin/activities/pictures', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pictureId }),
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Pictures: the first one shows on Plan Days.</p>
      {pictures.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {pictures.map((picture, index) => (
            <li key={picture.id} className="flex w-40 flex-col gap-2">
              <img src={picture.thumb} alt={picture.name} className="aspect-[4/3] w-full border border-border object-cover" />
              <div className="flex gap-1">
                <button type="button" disabled={busy || index === 0} className={button} aria-label="Move earlier" onClick={() => move(index, -1)}>
                  ←
                </button>
                <button type="button" disabled={busy || index === pictures.length - 1} className={button} aria-label="Move later" onClick={() => move(index, 1)}>
                  →
                </button>
                <button type="button" disabled={busy} className={`${button} text-error`} onClick={() => remove(picture.id, picture.name)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp"
        disabled={busy}
        aria-label="Add pictures"
        className="text-sm"
        onChange={(event) => {
          const files = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = '';
          if (files.length > 0) void upload(files);
        }}
      />
    </div>
  );
}
