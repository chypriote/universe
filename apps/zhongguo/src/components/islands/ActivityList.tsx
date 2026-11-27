import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';
import { ActivityForm, activityError } from './ActivityForm';

const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

const label = (list: readonly { value: string; label: string }[], value: string | null) =>
  list.find((item) => item.value === value)?.label ?? '';

type Props = {
  activities: AdminActivity[];
  cities: AdminCity[];
  /** Called with the saved Activity; the list is the caller's state. */
  onSaved: (activity: AdminActivity) => void;
  onDeleted: (activity: AdminActivity) => void;
  onNotice: (text: string) => void;
  /** Leaves the City out of each row: the list is already under it. */
  hideCity?: boolean;
  /** With these, each row gets a checkbox for batch actions. */
  selected?: Set<number>;
  onToggle?: (activity: AdminActivity) => void;
};

/** Activities as rows: each opens to its form and a Delete. Shared by the Activities, City and Province pages. */
export function ActivityList({ activities, cities, onSaved, onDeleted, onNotice, hideCity, selected, onToggle }: Props) {
  async function remove(activity: AdminActivity) {
    if (!confirm(`Delete ${activity.name} for good?`)) return;
    const response = await fetch(`/api/admin/activities/${activity.id}`, { method: 'DELETE' });
    const result = (await response.json()) as { ok: boolean; error?: string };
    if (result.ok) {
      onDeleted(activity);
      onNotice(`${activity.name} deleted`);
    } else {
      onNotice(activityError(result.error ?? ''));
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {activities.map((activity) => (
        <li key={activity.id} className={`flex items-start border ${selected?.has(activity.id) ? 'border-primary' : 'border-border'}`}>
          {onToggle && (
            <input
              type="checkbox"
              className="mt-5 ml-4 size-4 shrink-0 cursor-pointer accent-primary"
              aria-label={`Select ${activity.name}`}
              checked={selected?.has(activity.id) ?? false}
              onChange={() => onToggle(activity)}
            />
          )}
          <details className="min-w-0 flex-1">
            <summary className="flex cursor-pointer items-center gap-4 p-4">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-serif text-xl">{activity.name}</span>
                  <span lang="zh">{activity.nameZh}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {!hideCity && `${activity.city} · `}
                  {label(ACTIVITY_KINDS, activity.kind)}
                  {activity.rating ? ` · ${label(ACTIVITY_RATINGS, activity.rating)}` : ' · No rating'}
                </span>
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {activity.days} {activity.days === 1 ? 'Day' : 'Days'}
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border p-4">
              <ActivityForm key={JSON.stringify({ ...activity, pictures: undefined })} cities={cities} activity={activity} onSaved={onSaved} onError={onNotice} />
              <p className="text-sm text-muted-foreground">
                {activity.pictures.length} {activity.pictures.length === 1 ? 'picture' : 'pictures'}:{' '}
                <a href={`/admin/gallery?activities=${encodeURIComponent(activity.province)}`}>manage them in the Gallery</a>.
              </p>
              <span className="self-start" title={activity.days > 0 ? 'A Day or a Plan Day lists it: take it off first.' : undefined}>
                <button type="button" className={`${button} text-error`} disabled={activity.days > 0} onClick={() => void remove(activity)}>
                  Delete
                </button>
              </span>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
