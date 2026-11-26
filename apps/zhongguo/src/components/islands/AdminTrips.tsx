import { useState } from 'react';
import type { AdminTrip } from '@/lib/journal';

const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

/** Every Trip with its type, its on/off switch and its Plan page switch. */
export function AdminTrips(props: { trips: AdminTrip[] }) {
  const [trips, setTrips] = useState(props.trips);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  async function toggle(trip: AdminTrip, key: 'visible' | 'onPlan') {
    setBusy(trip.slug);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/trips/${encodeURIComponent(trip.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: !trip[key] }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (result.ok) {
        setTrips((current) => current.map((item) => (item.slug === trip.slug ? { ...item, [key]: !trip[key] } : item)));
      } else {
        setNotice(result.error ?? 'Not saved');
      }
    } catch {
      setNotice('Not saved: the request failed');
    }
    setBusy('');
  }

  return (
    <div>
      {notice && (
        <p role="status" className="mb-4 text-sm text-error">
          {notice}
        </p>
      )}
      <ul className="divide-y divide-border border border-border">
        {trips.map((trip) => (
          <li key={trip.slug} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-serif text-xl">{trip.title}</p>
              <p className="text-sm text-muted-foreground">
                {trip.type === 'report' ? 'Report' : 'Plan'} · {trip.visible ? 'On' : 'Off'} · Plan page {trip.onPlan ? 'on' : 'off'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href={`/admin/trips/${trip.slug}`} className={`${button} no-underline`}>
                Edit
              </a>
              <button
                type="button"
                role="switch"
                aria-checked={trip.visible}
                aria-label={`${trip.title} on`}
                className={button}
                disabled={busy === trip.slug}
                onClick={() => void toggle(trip, 'visible')}
              >
                {trip.visible ? 'Switch off' : 'Switch on'}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={trip.onPlan}
                aria-label={`${trip.title} on the Plan page`}
                className={button}
                disabled={busy === trip.slug}
                onClick={() => void toggle(trip, 'onPlan')}
              >
                {trip.onPlan ? 'Hide from Plan' : 'Show on Plan'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
