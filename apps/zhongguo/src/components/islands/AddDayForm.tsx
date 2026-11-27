import { useState, type SyntheticEvent } from 'react';
import type { AdminCity } from '@/lib/journal';

const MESSAGES: Record<string, string> = {
  'invalid-date': 'The date is not a valid date',
  'date-taken': 'This Trip already has a Day on that date',
  'unknown-city': 'Unknown City',
  'invalid-title': 'A Day needs a title',
  'unknown-trip': 'The Trip no longer exists: reload the page',
};

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button =
  'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

/** Adds a Day to a Trip. The page reloads on success: dates, numbers and Photos may all move. */
export function AddDayForm({ slug, cities }: { slug: string; cities: AdminCity[] }) {
  const [date, setDate] = useState('');
  const [cityId, setCityId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/trips/${encodeURIComponent(slug)}/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, cityId: Number(cityId), title, notes }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (result.ok) return window.location.reload();
      setNotice(MESSAGES[result.error ?? ''] ?? result.error ?? 'Not saved');
    } catch {
      setNotice('Not saved: the request failed');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Date
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={field}
        />
      </label>
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
      {notice && (
        <p role="status" className="text-sm text-error">
          {notice}
        </p>
      )}
      <div>
        <button type="submit" className={button} disabled={busy}>
          Add Day
        </button>
      </div>
    </form>
  );
}
