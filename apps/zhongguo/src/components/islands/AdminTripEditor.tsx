import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { AdminActivity, AdminCityDetail, AdminDay, AdminTripDetail } from '@/lib/journal';
import { AddDayForm } from './AddDayForm';
import { DayActivities } from './DayActivities';
import { DayText } from './DayText';
import { JournalSwitches } from './JournalSwitches';
import { JourneyMap } from './JourneyMap';
import { Cover, Highlights, PhotoBoard } from './PhotoPicks';
import { Tabs } from './Tabs';
import { button, message, save } from './admin-form';
import { Toast } from './Toast';

type Props = { trip: AdminTripDetail; cities: AdminCityDetail[]; activities: AdminActivity[] };

/* Days: each one has its text, a switch and its Photos. */

function Days({
  trip,
  cities,
  activities,
  onNotice,
}: {
  trip: AdminTripDetail;
  cities: AdminCityDetail[];
  activities: AdminActivity[];
  onNotice: (text: string) => void;
}) {
  const [days, setDays] = useState(trip.days);
  const [activeId, setActiveId] = useState<number | null>(null);
  const label = (day: AdminDay) =>
    day.number === null ? `Hidden ${day.date}` : `Day ${day.number}`;
  const active = days.find((day) => day.id === activeId);

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
      <h2 id="days-title" className="sr-only">
        Days
      </h2>
      <PhotoBoard
        photos={trip.photos}
        days={trip.days}
        daysUrl="/api/admin/days"
        onNotice={onNotice}
        aside={
          <JourneyMap
            cities={cities}
            days={days.map((day) => ({ ...day, label: label(day) }))}
            active={active ? { ...active, label: label(active) } : null}
          />
        }
      >
        {(list) =>
          days.map((day) => (
            <article
              key={day.id}
              onPointerEnter={() => setActiveId(day.id)}
              onFocusCapture={() => setActiveId(day.id)}
              className={`flex flex-col gap-4 border p-6 ${day.id === activeId ? 'border-primary' : 'border-border'} ${day.visible ? 'bg-background' : 'bg-surface'}`}
            >
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
                    {day.visible ? (
                      <Eye aria-hidden="true" className="size-4" />
                    ) : (
                      <EyeOff aria-hidden="true" className="size-4" />
                    )}
                  </button>
                }
              />
              <DayActivities
                url={`/api/admin/days/${day.id}/activities`}
                label={`Day of ${day.date}`}
                cityIds={(day.route.length > 0 ? day.route : [day.city]).map((city) => city.id)}
                activityIds={day.activityIds}
                activities={activities}
                onChange={(activityIds) => patchDay(day.id, { activityIds })}
                onNotice={onNotice}
              />
              {list(day.id, `Photos of ${day.date}`)}
            </article>
          ))
        }
      </PhotoBoard>
    </section>
  );
}

/** The Trip editor of the Journal: its switch, then its Days or its cover and Highlight Photos. */
export function AdminTripEditor({ trip, cities, activities }: Props) {
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'days' | 'covers'>('days');
  const base = `/api/admin/trips/${encodeURIComponent(trip.slug)}`;
  return (
    <div className="flex flex-col gap-8">
      <Toast text={notice} onDone={() => setNotice('')} />
      <JournalSwitches
        url={base}
        switches={[{ key: 'visible', label: 'Visible', on: trip.visible }]}
      />
      <Tabs
        tabs={[
          { id: 'days', label: `Days ${trip.days.length}` },
          { id: 'covers', label: 'Cover & highlights' },
        ]}
        current={tab}
        onChange={setTab}
      />
      {tab === 'days' ? (
        <>
          <details className="border border-border p-6" open={trip.days.length === 0}>
            <summary className="cursor-pointer font-serif text-xl">Add a Day</summary>
            <div className="mt-4">
              <AddDayForm slug={trip.slug} cities={cities} />
            </div>
          </details>
          {trip.days.length > 0 && (
            <Days trip={trip} cities={cities} activities={activities} onNotice={setNotice} />
          )}
        </>
      ) : (
        <>
          <Cover
            base={base}
            label="Trip Cover"
            photos={trip.photos}
            coverId={trip.coverId}
            coverFocus={trip.coverFocus}
            onNotice={setNotice}
          />
          <Highlights
            base={base}
            photos={trip.photos}
            highlightIds={trip.highlightIds}
            onNotice={setNotice}
          />
        </>
      )}
    </div>
  );
}
