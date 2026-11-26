import { useState, type SyntheticEvent } from 'react';
import type { AdminPlanDetail } from '@/lib/journal';
import { button, field, message, save } from './admin-form';

/** A new Trip: a title, a start date and, if wanted, Plan Days to copy as its first Days. */
export function NewTripForm({ plans }: { plans: AdminPlanDetail[] }) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(ids: number[], on: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function create(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await save('POST', '/api/admin/trips', { title, startDate, planDayIds: [...picked] });
    if (result.ok) return window.location.assign(`/admin/trips/${encodeURIComponent(String(result.slug))}`);
    setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void create(event)} aria-labelledby="new-trip-title" className="flex flex-col gap-4 border border-border p-6">
      <h2 id="new-trip-title" className="font-serif text-2xl">New Trip</h2>
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input type="text" required value={title} onChange={(event) => setTitle(event.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Start date
        <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={field} />
      </label>
      {plans.some((plan) => plan.days.length > 0) && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm">Copy Days from a plan (optional). They get one date after the other, without Photos.</legend>
          {plans
            .filter((plan) => plan.days.length > 0)
            .map((plan) => {
              const ids = plan.days.map((day) => day.id);
              const all = ids.every((id) => picked.has(id));
              return (
                <details key={plan.slug} className="border border-border p-3">
                  <summary className="cursor-pointer text-sm">
                    {plan.title} ({ids.filter((id) => picked.has(id)).length} of {ids.length})
                  </summary>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={all} onChange={(event) => toggle(ids, event.target.checked)} />
                    All Days of {plan.title}
                  </label>
                  <ul className="mt-2 flex flex-col gap-1">
                    {plan.days.map((day) => (
                      <li key={day.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={picked.has(day.id)} onChange={(event) => toggle([day.id], event.target.checked)} />
                          Day {day.number}: {day.title} ({day.city.name})
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
        </fieldset>
      )}
      {notice && (
        <p role="status" className="text-sm text-error">
          {notice}
        </p>
      )}
      <div>
        <button type="submit" className={button} disabled={busy}>
          Create Trip
        </button>
      </div>
    </form>
  );
}
