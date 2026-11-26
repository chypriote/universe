import { useState } from 'react';
import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ACTIVITY_KINDS } from '@/lib/journal/activity-kinds';
import { ActivityForm } from './ActivityForm';
import { ActivityList } from './ActivityList';
import { Toast } from './Toast';

type Props = { activities: AdminActivity[]; cities: AdminCity[] };

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';

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

      <ActivityList
        activities={shown}
        cities={cities}
        onSaved={saved}
        onDeleted={(activity) => setActivities((list) => list.filter((item) => item.id !== activity.id))}
        onNotice={setNotice}
      />
    </div>
  );
}
