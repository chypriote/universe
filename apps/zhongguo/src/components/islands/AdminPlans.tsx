import { useState, type SyntheticEvent } from 'react';
import type { AdminPlan } from '@/lib/journal';
import { button, field, message, save } from './admin-form';

/** Every plan with its switches, and a form to start a new one. */
export function AdminPlans(props: { plans: AdminPlan[] }) {
  const [plans, setPlans] = useState(props.plans);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');

  async function toggle(plan: AdminPlan, key: 'visible' | 'searchFlights') {
    setBusy(plan.slug);
    setNotice('');
    const result = await save('PATCH', `/api/admin/plans/${encodeURIComponent(plan.slug)}`, { [key]: !plan[key] });
    if (result.ok) setPlans((current) => current.map((item) => (item.slug === plan.slug ? { ...item, [key]: !plan[key] } : item)));
    else setNotice(message(result.error));
    setBusy('');
  }

  async function create(event: SyntheticEvent) {
    event.preventDefault();
    setBusy('new');
    setNotice('');
    const result = await save('POST', '/api/admin/plans', { title });
    if (result.ok) return window.location.assign(`/admin/plans/${encodeURIComponent(String(result.slug))}`);
    setNotice(message(result.error));
    setBusy('');
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={(event) => void create(event)} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New plan
          <input required className={field} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title, for example Yunnan" />
        </label>
        <button type="submit" className={button} disabled={busy === 'new'}>
          Create plan
        </button>
      </form>
      {notice && (
        <p role="status" className="text-sm text-error">
          {notice}
        </p>
      )}
      <ul className="divide-y divide-border border border-border">
        {plans.length === 0 && <li className="p-4 text-sm text-muted-foreground">No plans yet.</li>}
        {plans.map((plan) => (
          <li key={plan.slug} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-serif text-xl">{plan.title}</p>
              <p className="text-sm text-muted-foreground">
                {plan.days} {plan.days === 1 ? 'day' : 'days'} · {plan.visible ? 'Visible' : 'Hidden'} · Flight search {plan.searchFlights ? 'on' : 'off'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href={`/admin/plans/${plan.slug}`} className={`${button} no-underline`}>
                Edit
              </a>
              <button type="button" role="switch" aria-checked={plan.visible} aria-label={`${plan.title} visible`} className={button} disabled={busy === plan.slug} onClick={() => void toggle(plan, 'visible')}>
                {plan.visible ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={plan.searchFlights}
                aria-label={`Search flights for ${plan.title}`}
                className={button}
                disabled={busy === plan.slug}
                onClick={() => void toggle(plan, 'searchFlights')}
              >
                {plan.searchFlights ? 'Stop flight search' : 'Search flights'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
