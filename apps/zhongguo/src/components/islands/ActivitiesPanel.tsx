import { useState } from 'react';
import type { AdminActivity, AdminCity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';
import { ActivityForm, activityError } from './ActivityForm';
import { ActivityList } from './ActivityList';
import { button, field, save } from './admin-form';

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

const byCity = (a: AdminActivity, b: AdminActivity) =>
  a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** The Activities of one City or one Province, to search, add, edit, batch-edit and delete: the City and Province admin pages. */
export function ActivitiesPanel({
  activities: initial,
  cities,
  inScope,
  cityId,
  groupByCity,
  onNotice,
}: Props) {
  const [activities, setActivities] = useState(initial.filter(inScope).sort(byCity));
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [kind, setKind] = useState('');
  const [rating, setRating] = useState('');
  const [busy, setBusy] = useState(false);

  function saved(activity: AdminActivity) {
    setActivities((list) =>
      [
        ...list.filter((item) => item.id !== activity.id),
        ...(inScope(activity) ? [activity] : []),
      ].sort(byCity),
    );
    onNotice(`${activity.name} saved`);
  }

  const removed = (activity: AdminActivity) => {
    setActivities((list) => list.filter((item) => item.id !== activity.id));
    setSelected((current) => new Set([...current].filter((id) => id !== activity.id)));
  };
  const toggle = (activity: AdminActivity) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(activity.id)) next.add(activity.id);
      return next;
    });

  const words = fold(query.trim());
  const shown = words
    ? activities.filter((activity) =>
        [activity.name, activity.nameZh, activity.pinyin].some((text) =>
          fold(text).includes(words),
        ),
      )
    : activities;
  const cityNames = [...new Set(shown.map((activity) => activity.city))];
  const list = (items: AdminActivity[]) => (
    <ActivityList
      activities={items}
      cities={cities}
      onSaved={saved}
      onDeleted={removed}
      onNotice={onNotice}
      hideCity
      selected={selected}
      onToggle={toggle}
    />
  );

  async function apply(change: { kind?: string; rating?: string | null }) {
    setBusy(true);
    const result = await save('PATCH', '/api/admin/activities', { ids: [...selected], ...change });
    if (result.ok) {
      const fresh = result.activities as AdminActivity[];
      setActivities((list) =>
        list.map((item) => fresh.find((activity) => activity.id === item.id) ?? item),
      );
      onNotice(`${fresh.length} Activities updated`);
    } else {
      onNotice(activityError(result.error ?? ''));
    }
    setBusy(false);
  }

  const allShown = shown.length > 0 && shown.every((activity) => selected.has(activity.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className={`${field} min-w-0 flex-1`}
          placeholder="Search by name, hanzi or pinyin"
          aria-label="Search Activities"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className={`${button} !px-4 !py-2`}
          aria-expanded={adding}
          onClick={() => setAdding(!adding)}
        >
          {adding ? 'Close' : '+ Add an Activity'}
        </button>
      </div>
      {adding && (
        <div className="border border-border p-6">
          <ActivityForm
            cities={cities}
            cityId={cityId}
            onSaved={(activity) => {
              saved(activity);
              setAdding(false);
            }}
            onError={onNotice}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={allShown}
            onChange={() =>
              setSelected(allShown ? new Set() : new Set(shown.map((activity) => activity.id)))
            }
          />
          {shown.length === activities.length
            ? `${activities.length} Activities`
            : `${shown.length} of ${activities.length} Activities`}
        </label>
        {selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span>{selected.size} selected</span>
            <select
              className={`${field} !py-1`}
              aria-label="Kind for the selection"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">Kind…</option>
              {ACTIVITY_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${button} !px-3 !py-1`}
              disabled={busy || !kind}
              onClick={() => void apply({ kind })}
            >
              Set kind
            </button>
            <select
              className={`${field} !py-1`}
              aria-label="Rating for the selection"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              <option value="">Rating…</option>
              {ACTIVITY_RATINGS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
              <option value="none">No rating</option>
            </select>
            <button
              type="button"
              className={`${button} !px-3 !py-1`}
              disabled={busy || !rating}
              onClick={() => void apply({ rating: rating === 'none' ? null : rating })}
            >
              Set rating
            </button>
            <button
              type="button"
              className="cursor-pointer text-muted-foreground hover:text-primary"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {groupByCity
        ? cityNames.map((name) => (
            <div key={name} className="flex flex-col gap-3">
              <h3 className="font-serif text-xl">{name}</h3>
              {list(shown.filter((activity) => activity.city === name))}
            </div>
          ))
        : list(shown)}
      {shown.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {activities.length === 0 ? 'No Activity yet.' : 'No Activity matches.'}
        </p>
      )}
    </div>
  );
}
