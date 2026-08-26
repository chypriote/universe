import { useMemo, useState } from 'react';
import {
  buildCalendarMonths,
  buildCityCalendarDays,
  formatDateRange,
  getDayDate,
  type PlanDay,
} from '@/lib/plan-calendar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type PlanCalendarProps = {
  days: PlanDay[];
  startDate: string;
};

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function PlanCalendar({ days, startDate }: PlanCalendarProps) {
  const [chosenStart, setChosenStart] = useState(startDate);
  const activeStart = isIsoDate(chosenStart) ? chosenStart : startDate;

  const cells = useMemo(
    () => buildCityCalendarDays(days, activeStart),
    [activeStart, days],
  );
  const months = useMemo(() => buildCalendarMonths(cells), [cells]);
  const lastDayNumber = days.reduce((max, planDay) => Math.max(max, planDay.day), 1);
  const lastDate = days.length > 0 ? getDayDate(activeStart, lastDayNumber) : activeStart;
  const matchesPublished = activeStart === startDate;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-primary">
            Your dates
          </span>
          <h2 className="text-h3 font-serif italic">Clone this loop onto a calendar</h2>
          <p className="text-muted-foreground font-serif italic leading-relaxed">
            Pick a start date to see each city on the calendar. This is a booking preview only — the
            published journal below stays as written.
          </p>
        </div>

        <label className="block shrink-0 space-y-2">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Start date
          </span>
          <input
            type="date"
            value={activeStart}
            onChange={(event) => setChosenStart(event.target.value)}
            className="block w-full min-w-[12rem] border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </label>
      </div>

      <p className="text-sm font-sans text-muted-foreground">
        <span className="font-medium text-foreground">{formatDateRange(activeStart, lastDate)}</span>
        {matchesPublished ? ' · published dates' : ' · shifted from the published start'}
      </p>

      {months.map((month) => {
        const totalCells = Math.ceil((month.weekdayOffset + month.daysInMonth) / 7) * 7;

        return (
          <div key={month.key} className="border border-border bg-background">
            <div className="border-b border-border px-4 py-4 lg:px-6">
              <h3 className="font-serif text-xl italic">{month.label}</h3>
            </div>

            <div className="grid grid-cols-7 border-b border-border bg-surface/80">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-2 py-3 text-center text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground border-r border-border/70 last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, index) => {
                const dayOfMonth = index - month.weekdayOffset + 1;
                const inMonth = dayOfMonth >= 1 && dayOfMonth <= month.daysInMonth;
                const cell = inMonth ? month.cells.get(dayOfMonth) : undefined;

                if (!inMonth) {
                  return (
                    <div
                      key={`${month.key}-pad-${index}`}
                      className="min-h-[6.5rem] border-r border-b border-border/70 bg-surface/40 last:border-r-0"
                    />
                  );
                }

                return (
                  <article
                    key={`${month.key}-${dayOfMonth}`}
                    className={`min-h-[6.5rem] p-3 border-r border-b border-border/70 ${
                      cell ? 'bg-primary/[0.04]' : 'bg-background'
                    }`}
                  >
                    <span className="text-sm font-sans font-bold tabular-nums text-foreground">
                      {dayOfMonth}
                    </span>
                    {cell && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-primary">
                          Day {cell.day}
                        </p>
                        <p className="text-sm font-serif italic leading-snug text-foreground">
                          {cell.city}
                        </p>
                        {cell.cityZh && (
                          <p className="text-[11px] font-sans text-muted-foreground" lang="zh">
                            {cell.cityZh}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
