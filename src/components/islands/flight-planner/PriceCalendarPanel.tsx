import type { RefObject } from 'react';
import type { FlightSearchRow } from '@/lib/flight-utils';
import { priceToColor } from '@/lib/flight-utils';
import type { CalendarDay, PriceRange } from './types';
import { formatPrice } from './utils';

interface CalendarDayCellProps {
  day: CalendarDay;
  isSelectedDay: boolean;
  selectedFlightId: string | null;
  priceRange: PriceRange;
  dayRef: (element: HTMLElement | null) => void;
  pillRef: (flightId: string, element: HTMLButtonElement | null) => void;
  onSelectFlight: (flight: FlightSearchRow) => void;
}

export function CalendarDayCell({
  day,
  isSelectedDay,
  selectedFlightId,
  priceRange,
  dayRef,
  pillRef,
  onSelectFlight,
}: CalendarDayCellProps) {
  const hasResults = day.flights.length > 0;

  return (
    <article
      ref={dayRef}
      aria-label={`${day.day} ${day.month} ${day.date.slice(0, 4)} with ${day.flights.length} results`}
      className={`min-h-[12.5rem] p-3 border-r border-b border-border/70 grid gap-3 content-start ${
        hasResults ? 'bg-primary/[0.04]' : 'bg-surface/40'
      } ${isSelectedDay ? 'ring-2 ring-inset ring-primary/30 bg-primary/[0.07]' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold tabular-nums">{day.day}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {day.month}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {hasResults
            ? `${day.flights.length} fare${day.flights.length === 1 ? '' : 's'}`
            : 'No results'}
        </span>
      </div>

      {hasResults ? (
        <div className="grid gap-2 min-w-0 overflow-y-auto max-h-[8.5rem]">
          {day.flights.map((flight) => {
            const isSelectedFlight = selectedFlightId === flight.id;

            return (
              <button
                key={flight.id}
                ref={(element) => pillRef(flight.id, element)}
                type="button"
                onClick={() => onSelectFlight(flight)}
                className={`flex items-center justify-between gap-2 min-w-0 min-h-8 px-2.5 py-1 rounded-md border text-left transition-colors ${
                  isSelectedFlight
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border/80 bg-background/80 hover:bg-background'
                }`}
              >
                <span
                  className="min-w-0 truncate text-[11px] text-muted-foreground"
                  title={flight.cityLabel}
                >
                  {flight.airport}
                  {flight.isDirect ? '✈️' : ''}
                </span>
                <span
                  className="shrink-0 text-xs font-bold tabular-nums"
                  style={{ color: priceToColor(flight.price, priceRange.min, priceRange.max) }}
                >
                  {formatPrice(flight.price)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/60">No results</p>
      )}
    </article>
  );
}

interface PriceCalendarPanelProps {
  calendarDays: CalendarDay[];
  calendarSummary: { rangeLabel: string; daysWithResults: number } | null;
  selectedFlight: FlightSearchRow | null;
  selectedFlightId: string | null;
  priceRange: PriceRange;
  calendarPanelRef: RefObject<HTMLDivElement>;
  calendarDayRefs: RefObject<Map<string, HTMLElement>>;
  calendarPillRefs: RefObject<Map<string, HTMLButtonElement>>;
  onSelectFlight: (flight: FlightSearchRow) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function PriceCalendarPanel({
  calendarDays,
  calendarSummary,
  selectedFlight,
  selectedFlightId,
  priceRange,
  calendarPanelRef,
  calendarDayRefs,
  calendarPillRefs,
  onSelectFlight,
}: PriceCalendarPanelProps) {
  return (
    <div ref={calendarPanelRef} className="lg:col-span-3 border border-border bg-background">
      <div className="p-6 lg:p-8 border-b border-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-serif text-3xl font-bold mb-1">Price Calendar</h3>
            <p className="text-muted-foreground text-sm font-sans">
              {calendarSummary
                ? `${calendarSummary.rangeLabel} · ${calendarSummary.daysWithResults} departure days with fares`
                : 'Select a route from recent search results to inspect departure prices by date'}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-1.5 text-success">
              <span className="w-2 h-2 rounded-full bg-success"></span> Lowest
            </div>
            <div className="flex items-center gap-1.5 text-warning">
              <span className="w-2 h-2 rounded-full bg-warning"></span> Mid-range
            </div>
            <div className="flex items-center gap-1.5 text-error">
              <span className="w-2 h-2 rounded-full bg-error"></span> Highest
            </div>
          </div>
        </div>
      </div>

      {calendarDays.length > 0 ? (
        <div>
          <div className="grid grid-cols-7 border-b border-border bg-surface/80">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="px-3 py-3 text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground border-r border-border/70 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => (
              <CalendarDayCell
                key={day.date}
                day={day}
                isSelectedDay={selectedFlight?.outboundDate === day.date}
                selectedFlightId={selectedFlightId}
                priceRange={priceRange}
                dayRef={(element) => {
                  if (element) {
                    calendarDayRefs.current.set(day.date, element);
                  } else {
                    calendarDayRefs.current.delete(day.date);
                  }
                }}
                pillRef={(flightId, element) => {
                  if (element) {
                    calendarPillRefs.current.set(flightId, element);
                  } else {
                    calendarPillRefs.current.delete(flightId);
                  }
                }}
                onSelectFlight={onSelectFlight}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-16 text-center text-muted-foreground text-sm">
          Choose a route from recent search results to inspect its price calendar.
        </div>
      )}
    </div>
  );
}
