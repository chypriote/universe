import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import type { AdminCity, AdminPlanDay, AdminPlanDetail } from '@/lib/journal';
import { DayText } from './DayText';
import { button, field, message, save } from './admin-form';
import { Toast } from './Toast';

type Props = { plan: AdminPlanDetail; cities: AdminCity[] };

/** The numbered Days of a plan: edit, move, delete, and add one at the end. The page reloads after a change of order. */
export function AdminPlanEditor({ plan, cities }: Props) {
  const [days, setDays] = useState(plan.days);
  const [notice, setNotice] = useState('');
  const [cityId, setCityId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

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
    const result = await save('POST', `/api/admin/plans/${encodeURIComponent(plan.slug)}/days`, { cityId: Number(cityId), title, notes });
    if (result.ok) return window.location.reload();
    setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <section aria-labelledby="add-day-title" className="flex flex-col gap-4">
        <h2 id="add-day-title" className="font-serif text-2xl">Add Day</h2>
        <form onSubmit={(event) => void add(event)} className="flex flex-col gap-3 border border-border p-6">
          <label className="flex flex-col gap-1 text-sm">
            Main City
            <select required value={cityId} onChange={(event) => setCityId(event.target.value)} className={field}>
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
            <input type="text" required value={title} onChange={(event) => setTitle(event.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className={field} />
          </label>
          <div>
            <button type="submit" className={button} disabled={busy}>
              Add Day
            </button>
          </div>
        </form>
      </section>
      {days.length > 0 && (
        <section aria-labelledby="days-title" className="flex flex-col gap-6">
          <h2 id="days-title" className="font-serif text-2xl">Days</h2>
          {days.map((day, index) => (
            <article key={day.id} className="flex flex-col gap-4 border border-border bg-background p-6">
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
                    <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Move Day ${day.number} up`} disabled={index === 0} onClick={() => void move(day, 'up')}>
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Move Day ${day.number} down`} disabled={index === days.length - 1} onClick={() => void move(day, 'down')}>
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" className={`${button} grid size-9 place-items-center !p-0`} aria-label={`Delete Day ${day.number}`} onClick={() => void remove(day)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </>
                }
              />
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
