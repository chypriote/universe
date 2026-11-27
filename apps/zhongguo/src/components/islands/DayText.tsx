import { useState, type ReactNode } from 'react';
import type { AdminCity } from '@/lib/journal';
import { button, field, message, save } from './admin-form';

/** The text of a Day, as the admin edits it: a Trip's or a plan's. */
export type DayFields = {
  id: number;
  title: string;
  notes: string;
  city: { id: number; name: string };
  /** Every City of the Day in travel order; empty for a Day with one City. */
  route: { id: number; name: string }[];
  province: string;
};

type Props = {
  day: DayFields;
  /** Heading, for example "Day 3 · 2025-03-01". */
  heading: string;
  /** Names the Day in field labels and in the saved notice. */
  label: string;
  /** Where the Day is saved, by PATCH. */
  url: string;
  cities: AdminCity[];
  onChange: (patch: Partial<DayFields>) => void;
  onNotice: (text: string) => void;
  /** Buttons after Save day. */
  actions?: ReactNode;
};

export function DayText({ day, heading, label, url, cities, onChange, onNotice, actions }: Props) {
  const [title, setTitle] = useState(day.title);
  const [notes, setNotes] = useState(day.notes);
  const initial =
    day.route.length > 0 ? day.route.map((city) => String(city.id)) : [String(day.city.id)];
  // The Cities of the Day in travel order, the last being where it ends, and which one is the main City.
  const [rows, setRows] = useState(initial);
  const [mainAt, setMainAt] = useState(Math.max(0, initial.indexOf(String(day.city.id))));
  const dirty =
    title !== day.title ||
    notes !== day.notes ||
    rows.join() !== initial.join() ||
    Number(rows[mainAt]) !== day.city.id;

  async function saveText() {
    const cityId = Number(rows[mainAt]);
    const result = await save('PATCH', url, {
      title,
      notes,
      cityId,
      routeCityIds: rows.length > 1 ? rows.map(Number) : [],
    });
    if (result.ok) {
      const city = cities.find((candidate) => candidate.id === cityId)!;
      onChange({
        title: title.trim(),
        notes,
        city: { id: city.id, name: city.name },
        route:
          rows.length > 1
            ? rows.map((id) => ({
                id: Number(id),
                name: cities.find((candidate) => candidate.id === Number(id))!.name,
              }))
            : [],
        province: city.province,
      });
    }
    onNotice(result.ok ? `${label} saved` : message(result.error));
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl">{heading}</h3>
        <div className="flex gap-3">
          <button
            type="button"
            className={button}
            disabled={!dirty}
            onClick={() => void saveText()}
          >
            Save day
          </button>
          {actions}
        </div>
      </header>
      <div className="flex flex-col gap-3">
        <input
          className={field}
          aria-label={`Title of ${label}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {rows.map((id, index) => (
          <div key={index} className="flex flex-wrap items-center gap-3">
            <select
              className={`${field} min-w-48 flex-1`}
              aria-label={`City ${index + 1} of ${label}${index === rows.length - 1 && rows.length > 1 ? ', where the Day ends' : ''}`}
              value={id}
              onChange={(event) =>
                setRows(rows.map((value, i) => (i === index ? event.target.value : value)))
              }
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.province})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`main-${label}`}
                checked={mainAt === index}
                onChange={() => setMainAt(index)}
              />
              Main City
            </label>
            <button
              type="button"
              className={button}
              disabled={rows.length === 1 || mainAt === index}
              onClick={() => {
                setRows(rows.filter((_, i) => i !== index));
                if (index < mainAt) setMainAt(mainAt - 1);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={`${button} self-start`}
          onClick={() => setRows([...rows, rows.at(-1)!])}
        >
          Add a City
        </button>
        <textarea
          className={`${field} min-h-24`}
          aria-label={`Notes of ${label}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </>
  );
}
