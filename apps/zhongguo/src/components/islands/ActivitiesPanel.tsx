import { useState } from 'react';
import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ActivityForm } from './ActivityForm';
import { ActivityList } from './ActivityList';

type Props = {
  /** Every Activity: the panel keeps those of its scope. */
  activities: AdminActivity[];
  /** Every City, for the form. */
  cities: AdminCity[];
  inScope: (activity: AdminActivity) => boolean;
  /** The City picked when adding. */
  cityId?: number;
  /** Lists the Activities under their City. */
  groupByCity?: boolean;
  onNotice: (text: string) => void;
};

const byCity = (a: AdminActivity, b: AdminActivity) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name);

/** The Activities of one City or one Province, to add, edit and delete: the City and Province admin pages. */
export function ActivitiesPanel({ activities: initial, cities, inScope, cityId, groupByCity, onNotice }: Props) {
  const [activities, setActivities] = useState(initial.filter(inScope).sort(byCity));

  function saved(activity: AdminActivity) {
    setActivities((list) => [...list.filter((item) => item.id !== activity.id), ...(inScope(activity) ? [activity] : [])].sort(byCity));
    onNotice(`${activity.name} saved`);
  }

  const removed = (activity: AdminActivity) => setActivities((list) => list.filter((item) => item.id !== activity.id));
  const cityNames = [...new Set(activities.map((activity) => activity.city))];
  const list = (items: AdminActivity[]) => (
    <ActivityList activities={items} cities={cities} onSaved={saved} onDeleted={removed} onNotice={onNotice} hideCity />
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{activities.length} Activities</p>
      {groupByCity
        ? cityNames.map((name) => (
            <div key={name} className="flex flex-col gap-3">
              <h3 className="font-serif text-xl">{name}</h3>
              {list(activities.filter((activity) => activity.city === name))}
            </div>
          ))
        : list(activities)}
      <details className="border border-border p-6">
        <summary className="cursor-pointer font-serif text-xl">Add an Activity</summary>
        <div className="mt-4">
          <ActivityForm cities={cities} cityId={cityId} onSaved={saved} onError={onNotice} />
        </div>
      </details>
    </div>
  );
}
