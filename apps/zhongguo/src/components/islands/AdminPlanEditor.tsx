import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import type { AdminActivity, AdminCityDetail, AdminPlanDay, AdminPlanDetail } from '@/lib/journal';
import { DayActivities } from './DayActivities';
import { DayText } from './DayText';
import { JournalSwitches } from './JournalSwitches';
import { JourneyMap } from './JourneyMap';
import { Cover, Highlights, PhotoBoard } from './PhotoPicks';
import { Tabs } from './Tabs';
import { button, field, message, save } from './admin-form';
import { Toast } from './Toast';

type Props = { plan: AdminPlanDetail; cities: AdminCityDetail[]; activities: AdminActivity[] };

/** The numbered Days of a plan: edit, move, delete, and add one at the end. The page reloads after a change of order. */
export function AdminPlanEditor({ plan, cities, activities }: Props) {
  const [days, setDays] = useState(plan.days);
  const [notice, setNotice] = useState('');
  const [cityId, setCityId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/admin/plans/${encodeURIComponent(plan.slug)}`;
  const [tab, setTab] = useState<'days' | 'covers'>('days');
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = days.find((day) => day.id === activeId);

  const patchDay = (id: number, patch: Partial<AdminPlanDay>) =>
    setDays((current) => current.map((day) => (day.id === id ? { ...day, ...patch } : day)));

  async function move(day: AdminPlanDay, direction: 'up' | 'down') {
    const result = await save('PATCH', `/api/admin/plan-days/${day.id}`, { move: direction });
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
  }

  async function remove(day: AdminPlanDay) {
    if (!window.confirm(`Delete Day ${day.number}, ${day.title}?`)) return;
    const result = await save('DELETE', `/api/admin/plan-days/${day.id}`, {});
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
  }

  async function add(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await save('POST', `/api/admin/plans/${encodeURIComponent(plan.slug)}/days`, {
      cityId: Number(cityId),
      title,
      notes,
    });
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <JournalSwitches
        url={base}
        switches={[
          { key: 'visible', label: 'Visible', on: plan.visible },
          { key: 'searchFlights', label: 'Search flights', on: plan.searchFlights },
        ]}
      />
      <Tabs
        tabs={[
          { id: 'days', label: `Days ${days.length}` },
          { id: 'covers', label: 'Cover & highlights' },
        ]}
        current={tab}
        onChange={setTab}
      />
      <p className="-mt-8 text-sm text-muted-foreground">
        Upload the plan's Photos and set their City in the{' '}
        <a href={`/admin/gallery?plan=${encodeURIComponent(plan.slug)}`}>Gallery</a>.
      </p>
      {tab === 'covers' && (
        <>
          <Cover
            base={base}
            label="Plan cover"
            photos={plan.photos}
            coverId={plan.coverId}
            coverFocus={plan.coverFocus}
            onNotice={setNotice}
          />
          <Highlights
            base={base}
            photos={plan.photos}
            highlightIds={plan.highlightIds}
            onNotice={setNotice}
          />
        </>
      )}
      {tab === 'days' && (
        <details className="border border-border p-6" open={days.length === 0}>
          <summary className="cursor-pointer font-serif text-xl">Add a Day</summary>
          <form onSubmit={(event) => void add(event)} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Main City
              <select
                required
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                className={field}
              >
                <option value="">Choose a City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.province}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Title
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Notes (optional)
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={field}
              />
            </label>
            <div>
              <button type="submit" className={button} disabled={busy}>
                Add Day
              </button>
            </div>
          </form>
        </details>
      )}
      {tab === 'days' && days.length > 0 && (
        <section aria-labelledby="days-title" className="flex flex-col gap-6">
          <h2 id="days-title" className="sr-only">
            Days
          </h2>
          <PhotoBoard
            photos={plan.photos}
            days={plan.days}
            daysUrl="/api/admin/plan-days"
            onNotice={setNotice}
            aside={
              <JourneyMap
                cities={cities}
                days={days.map((day) => ({ ...day, label: `Day ${day.number}` }))}
                active={active ? { ...active, label: `Day ${active.number}` } : null}
              />
            }
          >
            {(list) =>
              days.map((day, index) => (
                <article
                  key={day.id}
                  onPointerEnter={() => setActiveId(day.id)}
                  onFocusCapture={() => setActiveId(day.id)}
                  className={`flex flex-col gap-4 border bg-background p-6 ${day.id === activeId ? 'border-primary' : 'border-border'}`}
                >
                  <DayText
                    day={day}
                    heading={`Day ${day.number} · ${(day.route.length > 0 ? day.route : [day.city]).map((city) => city.name).join(' → ')}, ${day.province}`}
                    label={`Day ${day.number}`}
                    url={`/api/admin/plan-days/${day.id}`}
                    cities={cities}
                    onChange={(patch) => patchDay(day.id, patch)}
                    onNotice={setNotice}
                    actions={
                      <>
                        <button
                          type="button"
                          className={`${button} grid size-9 place-items-center !p-0`}
                          aria-label={`Move Day ${day.number} up`}
                          disabled={index === 0}
                          onClick={() => void move(day, 'up')}
                        >
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={`${button} grid size-9 place-items-center !p-0`}
                          aria-label={`Move Day ${day.number} down`}
                          disabled={index === days.length - 1}
                          onClick={() => void move(day, 'down')}
                        >
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={`${button} grid size-9 place-items-center !p-0`}
                          aria-label={`Delete Day ${day.number}`}
                          onClick={() => void remove(day)}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </>
                    }
                  />
                  <DayActivities
                    url={`/api/admin/plan-days/${day.id}/activities`}
                    label={`Day ${day.number}`}
                    cityIds={(day.route.length > 0 ? day.route : [day.city]).map((city) => city.id)}
                    activityIds={day.activityIds}
                    activities={activities}
                    onChange={(activityIds) => patchDay(day.id, { activityIds })}
                    onNotice={setNotice}
                  />
                  {list(day.id, `Photos of Day ${day.number}`)}
                </article>
              ))
            }
          </PhotoBoard>
        </section>
      )}
    </div>
  );
}
