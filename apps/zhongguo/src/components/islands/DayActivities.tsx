import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useState } from 'react';
import type { AdminActivity } from '@/lib/journal';
import { button, field, message, save } from './admin-form';

type Props = {
  /** Where the Activities are saved, by PUT. */
  url: string;
  /** Names the Day in labels. */
  label: string;
  /** The Cities of the Day: only their Activities can be added. */
  cityIds: number[];
  activityIds: number[];
  /** Every Activity. */
  activities: AdminActivity[];
  onChange: (activityIds: number[]) => void;
  onNotice: (text: string) => void;
};

/** The Activities of a Day or a Plan Day: visit order, add and remove. Each change is saved at once. */
export function DayActivities({ url, label, cityIds, activityIds, activities, onChange, onNotice }: Props) {
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const listed = activityIds.flatMap((id) => activities.find((activity) => activity.id === id) ?? []);
  const free = activities.filter((activity) => !activityIds.includes(activity.id) && cityIds.includes(activity.cityId));

  async function change(next: number[], notice: string) {
    setBusy(true);
    const result = await save('PUT', url, { activityIds: next });
    setBusy(false);
    if (!result.ok) return onNotice(message(result.error));
    onChange(next);
    onNotice(notice);
  }

  function add() {
    const activity = activities.find((candidate) => String(candidate.id) === pick);
    if (!activity) return;
    setPick('');
    void change([...activityIds, activity.id], `${activity.name} added to ${label}`);
  }

  function move(index: number, by: -1 | 1) {
    const next = [...activityIds];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    void change(next, `Activities of ${label} saved`);
  }

  return (
    <section aria-label={`Activities of ${label}`} className="flex flex-col gap-3">
      <h4 className="eyebrow text-muted-foreground">Activities</h4>
      {listed.length === 0 && <p className="text-sm text-muted-foreground">No Activity yet.</p>}
      <ol className="flex flex-col gap-2">
        {listed.map((activity, index) => (
          <li key={activity.id} className="flex flex-wrap items-center gap-3 border border-border px-3 py-2 text-sm">
            <span className="min-w-48 flex-1">
              {activity.name} <span lang="zh">{activity.nameZh}</span> <span className="text-muted-foreground">· {activity.city}</span>
            </span>
            <button type="button" className={`${button} grid size-8 place-items-center !p-0`} aria-label={`Move ${activity.name} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
              <ArrowUp aria-hidden="true" className="size-4" />
            </button>
            <button type="button" className={`${button} grid size-8 place-items-center !p-0`} aria-label={`Move ${activity.name} down`} disabled={busy || index === listed.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              className={`${button} grid size-8 place-items-center !p-0`}
              aria-label={`Remove ${activity.name}`}
              disabled={busy}
              onClick={() => void change(activityIds.filter((id) => id !== activity.id), `${activity.name} removed from ${label}`)}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${field} min-w-48 flex-1`} aria-label={`Add an Activity to ${label}`} value={pick} onChange={(event) => setPick(event.target.value)}>
          <option value="">Add an Activity</option>
          {free.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name} · {activity.city}
            </option>
          ))}
        </select>
        <button type="button" className={button} disabled={busy || !pick} onClick={add}>
          Add
        </button>
        <a href="/admin/activities" className="text-sm underline">
          New Activity
        </a>
      </div>
    </section>
  );
}
