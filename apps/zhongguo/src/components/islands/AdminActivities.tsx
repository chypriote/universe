import { useState } from 'react';
import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';
import { ActivityForm, activityError } from './ActivityForm';
import { Toast } from './Toast';

type Props = { activities: AdminActivity[]; cities: AdminCity[] };

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

const label = (list: readonly { value: string; label: string }[], value: string | null) =>
  list.find((item) => item.value === value)?.label ?? '';

const byCity = (a: AdminActivity, b: AdminActivity) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name);

/** The Activities admin: every Activity by City, to add, edit and delete. */
export function AdminActivities(props: Props) {
  const { cities } = props;
  const [activities, setActivities] = useState(props.activities);
  const [cityId, setCityId] = useState('');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const shown = activities.filter(
    (activity) =>
      (!cityId || activity.cityId === Number(cityId)) &&
      (!kind || activity.kind === kind) &&
      (!search || `${activity.name} ${activity.nameZh} ${activity.pinyin}`.toLowerCase().includes(search.toLowerCase())),
  );

  async function remove(activity: AdminActivity) {
    if (!confirm(`Delete ${activity.name} for good?`)) return;
    const response = await fetch(`/api/admin/activities/${activity.id}`, { method: 'DELETE' });
    const result = (await response.json()) as { ok: boolean; error?: string };
    if (result.ok) {
      setActivities((list) => list.filter((item) => item.id !== activity.id));
      setNotice(`${activity.name} deleted`);
    } else {
      setNotice(activityError(result.error ?? ''));
    }
  }

  function saved(activity: AdminActivity) {
    setActivities((list) => [...list.filter((item) => item.id !== activity.id), activity].sort(byCity));
    setNotice(`${activity.name} saved`);
  }

  return (
    <div className="flex flex-col gap-8">
      <Toast text={notice} onDone={() => setNotice('')} />

      <details className="border border-border p-6">
        <summary className="cursor-pointer font-serif text-2xl">Add an Activity</summary>
        <div className="mt-4">
          <ActivityForm cities={cities} cityId={cityId ? Number(cityId) : undefined} onSaved={saved} onError={setNotice} />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <select className={field} aria-label="City" value={cityId} onChange={(event) => setCityId(event.target.value)}>
          <option value="">Every City</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} ({city.province})
            </option>
          ))}
        </select>
        <select className={field} aria-label="Kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="">Every kind</option>
          {ACTIVITY_KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input className={field} type="search" placeholder="Search" aria-label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <span className="text-sm text-muted-foreground">{shown.length} Activities</span>
      </div>

      <ul className="flex flex-col gap-3">
        {shown.map((activity) => (
          <li key={activity.id} className="border border-border">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
                <span className="font-serif text-xl">{activity.name}</span>
                <span lang="zh">{activity.nameZh}</span>
                <span className="text-sm text-muted-foreground">
                  {activity.city} · {label(ACTIVITY_KINDS, activity.kind)}
                  {activity.rating && ` · ${label(ACTIVITY_RATINGS, activity.rating)}`} · {activity.days} Days
                </span>
              </summary>
              <div className="flex flex-col gap-4 border-t border-border p-4">
                <ActivityForm key={JSON.stringify(activity)} cities={cities} activity={activity} onSaved={saved} onError={setNotice} />
                <button type="button" className={`${button} self-start text-error`} disabled={activity.days > 0} onClick={() => void remove(activity)}>
                  Delete
                </button>
                {activity.days > 0 && <p className="text-sm text-muted-foreground">A Day or a Plan Day lists it: take it off first.</p>}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
