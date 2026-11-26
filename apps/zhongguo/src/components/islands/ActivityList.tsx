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
};

/** Activities as rows: each opens to its form and a Delete. Shared by the Activities, City and Province pages. */
export function ActivityList({ activities, cities, onSaved, onDeleted, onNotice, hideCity }: Props) {
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
        <li key={activity.id} className="border border-border">
          <details>
            <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
              <span className="font-serif text-xl">{activity.name}</span>
              <span lang="zh">{activity.nameZh}</span>
              <span className="text-sm text-muted-foreground">
                {!hideCity && `${activity.city} · `}
                {label(ACTIVITY_KINDS, activity.kind)}
                {activity.rating && ` · ${label(ACTIVITY_RATINGS, activity.rating)}`} · {activity.days} Days
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border p-4">
              <ActivityForm key={JSON.stringify(activity)} cities={cities} activity={activity} onSaved={onSaved} onError={onNotice} />
              <button type="button" className={`${button} self-start text-error`} disabled={activity.days > 0} onClick={() => void remove(activity)}>
                Delete
              </button>
              {activity.days > 0 && <p className="text-sm text-muted-foreground">A Day or a Plan Day lists it: take it off first.</p>}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
