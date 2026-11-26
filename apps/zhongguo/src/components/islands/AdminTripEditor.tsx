import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { AdminCity, AdminDay, AdminTripDetail } from '@/lib/journal';
import { DayText } from './DayText';
import { Cover, Highlights, PhotoBoard } from './PhotoPicks';
import { button, message, save } from './admin-form';
import { Toast } from './Toast';

type Props = { trip: AdminTripDetail; cities: AdminCity[] };

/* Days: each one has its text, a switch and its Photos. */

function Days({ trip, cities, onNotice }: { trip: AdminTripDetail; cities: AdminCity[]; onNotice: (text: string) => void }) {
  const [days, setDays] = useState(trip.days);

  async function toggle(day: AdminDay) {
    const result = await save('PATCH', `/api/admin/days/${day.id}`, { visible: !day.visible });
    if (!result.ok) return onNotice(message(result.error));
    setDays((current) => {
      let number = 0;
      return current.map((item) => {
        const visible = item.id === day.id ? !day.visible : item.visible;
        return { ...item, visible, number: visible ? ++number : null };
      });
    });
    onNotice(day.visible ? `Day of ${day.date} is off` : `Day of ${day.date} is on`);
  }

  const patchDay = (id: number, patch: Partial<AdminDay>) =>
    setDays((current) => current.map((day) => (day.id === id ? { ...day, ...patch } : day)));

  return (
    <section aria-labelledby="days-title" className="flex flex-col gap-6">
      <h2 id="days-title" className="font-serif text-2xl">Days</h2>
      <PhotoBoard photos={trip.photos} days={trip.days} daysUrl="/api/admin/days" onNotice={onNotice}>
        {(list) =>
          days.map((day) => (
            <article key={day.id} className={`flex flex-col gap-4 border border-border p-6 ${day.visible ? 'bg-background' : 'bg-surface'}`}>
              <DayText
                day={day}
                heading={`${day.number === null ? 'Hidden' : `Day ${day.number}`} · ${day.date} · ${(day.route.length > 0 ? day.route : [day.city]).map((city) => city.name).join(' → ')}, ${day.province}`}
                label={`Day of ${day.date}`}
                url={`/api/admin/days/${day.id}`}
                cities={cities}
                onChange={(patch) => patchDay(day.id, patch)}
                onNotice={onNotice}
                actions={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={day.visible}
                    aria-label={`Day of ${day.date} on`}
                    title={day.visible ? 'Switch off' : 'Switch on'}
                    className={`${button} grid size-9 place-items-center !p-0`}
                    onClick={() => void toggle(day)}
                  >
                    {day.visible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
                  </button>
                }
              />
              {list(day.id, `Photos of ${day.date}`)}
            </article>
          ))
        }
      </PhotoBoard>
    </section>
  );
}

export function AdminTripEditor({ trip, cities }: Props) {
  const [notice, setNotice] = useState('');
  const base = `/api/admin/trips/${encodeURIComponent(trip.slug)}`;
  return (
    <div className="flex flex-col gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <Cover base={base} label="Trip Cover" photos={trip.photos} coverId={trip.coverId} coverFocus={trip.coverFocus} onNotice={setNotice} />
      <Highlights base={base} photos={trip.photos} highlightIds={trip.highlightIds} onNotice={setNotice} />
      <Days trip={trip} cities={cities} onNotice={setNotice} />
    </div>
  );
}
