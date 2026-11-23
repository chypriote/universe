import { useEffect, useMemo, useRef, useState } from 'react';
import { isVietnamAirport } from '@/lib/flight-utils';

interface FlightSearchRow {
  id: string;
  airport: string;
  price: number;
  outboundDate: string;
  returnDate: string;
  searchedOn: string;
  cityLabel: string;
  isDirect: boolean;
  isCityLowest: boolean;
  priceColor: string;
}

interface FlightPlannerProps {
  flights: FlightSearchRow[];
}

interface CalendarDay {
  date: string;
  day: number;
  month: string;
  flights: FlightSearchRow[];
}

interface ListFilters {
  airport: string;
  bestValueOnly: boolean;
  directOnly: boolean;
  vietnamOnly: boolean;
}

type ScrollTarget = 'list' | 'calendar';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const CHECKBOX_CLASS =
  'h-3.5 w-3.5 rounded-none border-border bg-background text-primary focus:ring-primary/30 focus:ring-offset-0';
const VIETNAM_ROW_CLASS =
  'bg-[color-mix(in_oklab,hsl(205_70%_82%)_55%,var(--color-surface))]';
const VIETNAM_PILL_CLASS =
  'border-[hsl(205_45%_72%)] bg-[hsl(205_70%_90%)] hover:bg-[hsl(205_70%_86%)]';

function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')}\u00a0€`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildCalendarDays(flights: FlightSearchRow[]): CalendarDay[] {
  if (flights.length === 0) {
    return [];
  }

  const outboundDates = flights.map((flight) => flight.outboundDate).sort();
  const start = new Date(`${outboundDates[0]}T12:00:00`);
  const end = new Date(`${outboundDates[outboundDates.length - 1]}T12:00:00`);

  const flightsByDate = new Map<string, FlightSearchRow[]>();
  for (const flight of flights) {
    const dayFlights = flightsByDate.get(flight.outboundDate) ?? [];
    dayFlights.push(flight);
    flightsByDate.set(flight.outboundDate, dayFlights);
  }

  for (const dayFlights of flightsByDate.values()) {
    dayFlights.sort((a, b) => a.price - b.price || a.airport.localeCompare(b.airport));
  }

  const days: CalendarDay[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const date = toDateKey(cursor);
    days.push({
      date,
      day: cursor.getDate(),
      month: cursor.toLocaleDateString('en-GB', { month: 'short' }),
      flights: flightsByDate.get(date) ?? [],
    });
  }

  return days;
}

function filterFlights(flights: FlightSearchRow[], filters: ListFilters): FlightSearchRow[] {
  return flights.filter((flight) => {
    if (filters.airport && flight.airport !== filters.airport) {
      return false;
    }
    if (filters.bestValueOnly && !flight.isCityLowest) {
      return false;
    }
    if (filters.directOnly && !flight.isDirect) {
      return false;
    }
    if (filters.vietnamOnly && !isVietnamAirport(flight.airport)) {
      return false;
    }
    return true;
  });
}

function getAirportOptions(flights: FlightSearchRow[]) {
  const byAirport = new Map<string, string>();
  for (const flight of flights) {
    if (!byAirport.has(flight.airport)) {
      byAirport.set(flight.airport, flight.cityLabel);
    }
  }

  return [...byAirport.entries()]
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([airport, cityLabel]) => ({ airport, cityLabel }));
}

export function FlightPlanner({ flights }: FlightPlannerProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    flights[0]?.id ?? null
  );
  const [filters, setFilters] = useState<ListFilters>({
    airport: '',
    bestValueOnly: false,
    directOnly: false,
    vietnamOnly: false,
  });
  const [recentPanelHeight, setRecentPanelHeight] = useState<number | null>(null);

  const listRowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const calendarDayRefs = useRef(new Map<string, HTMLElement>());
  const calendarPillRefs = useRef(new Map<string, HTMLButtonElement>());
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const pendingScrollTarget = useRef<ScrollTarget | null>(null);

  const airportOptions = useMemo(() => getAirportOptions(flights), [flights]);
  const filteredFlights = useMemo(
    () => filterFlights(flights, filters),
    [filters, flights]
  );
  const selectedFlight =
    filteredFlights.find((flight) => flight.id === selectedFlightId) ??
    filteredFlights[0] ??
    null;
  const calendarDays = useMemo(
    () => buildCalendarDays(filteredFlights),
    [filteredFlights]
  );
  const calendarSummary = useMemo(() => {
    if (calendarDays.length === 0) {
      return null;
    }

    const first = calendarDays[0];
    const last = calendarDays[calendarDays.length - 1];
    const daysWithResults = calendarDays.filter((day) => day.flights.length > 0).length;

    return {
      rangeLabel: `${formatShortDate(first.date)} — ${formatShortDate(last.date)}`,
      daysWithResults,
    };
  }, [calendarDays]);

  const selectFlight = (flightId: string, scrollTo: ScrollTarget) => {
    pendingScrollTarget.current = scrollTo;
    setSelectedFlightId(flightId);
  };

  const updateFilters = (nextFilters: ListFilters) => {
    setFilters(nextFilters);
  };

  useEffect(() => {
    if (filteredFlights.some((flight) => flight.id === selectedFlightId)) {
      return;
    }
    setSelectedFlightId(filteredFlights[0]?.id ?? null);
  }, [filteredFlights, selectedFlightId]);

  const selectFlightFromCalendar = (flight: FlightSearchRow) => {
    const nextFilters = { ...filters };

    if (nextFilters.airport && flight.airport !== nextFilters.airport) {
      nextFilters.airport = '';
    }
    if (nextFilters.bestValueOnly && !flight.isCityLowest) {
      nextFilters.bestValueOnly = false;
    }
    if (nextFilters.directOnly && !flight.isDirect) {
      nextFilters.directOnly = false;
    }
    if (nextFilters.vietnamOnly && !isVietnamAirport(flight.airport)) {
      nextFilters.vietnamOnly = false;
    }

    if (
      nextFilters.airport !== filters.airport ||
      nextFilters.bestValueOnly !== filters.bestValueOnly ||
      nextFilters.directOnly !== filters.directOnly ||
      nextFilters.vietnamOnly !== filters.vietnamOnly
    ) {
      setFilters(nextFilters);
    }

    selectFlight(flight.id, 'list');
  };

  useEffect(() => {
    const calendar = calendarPanelRef.current;
    if (!calendar) {
      return;
    }

    const syncRecentPanelHeight = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setRecentPanelHeight(calendar.offsetHeight);
      } else {
        setRecentPanelHeight(null);
      }
    };

    syncRecentPanelHeight();

    const observer = new ResizeObserver(syncRecentPanelHeight);
    observer.observe(calendar);
    window.addEventListener('resize', syncRecentPanelHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncRecentPanelHeight);
    };
  }, [calendarDays, flights.length]);

  useEffect(() => {
    const scrollTarget = pendingScrollTarget.current;
    if (!selectedFlightId || !scrollTarget) {
      return;
    }

    pendingScrollTarget.current = null;

    requestAnimationFrame(() => {
      if (scrollTarget === 'list') {
        listRowRefs.current.get(selectedFlightId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        return;
      }

      const flight = flights.find((item) => item.id === selectedFlightId);
      if (!flight) {
        return;
      }

      calendarDayRefs.current.get(flight.outboundDate)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      calendarPillRefs.current.get(selectedFlightId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [selectedFlightId, filters, filteredFlights, flights]);

  const hasActiveFilters = Boolean(
    filters.airport || filters.bestValueOnly || filters.directOnly || filters.vietnamOnly
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      <div
        className="lg:col-span-1 border border-border bg-surface flex flex-col min-h-0 overflow-hidden max-h-[34rem] lg:max-h-none"
        style={recentPanelHeight ? { height: recentPanelHeight } : undefined}
      >
        <div className="shrink-0 p-4 border-b border-border bg-background">
          <h2 className="eyebrow text-foreground flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recent Search Results
          </h2>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            One entry per airport-date combo, ordered from cheapest to priciest.
          </p>
          {flights.length > 0 && (
            <p className="mt-1 eyebrow text-muted-foreground">
              {hasActiveFilters
                ? `${filteredFlights.length} of ${flights.length} results`
                : `${flights.length} results`}
            </p>
          )}
          {airportOptions.length > 0 && (
            <label className="mt-4 block">
              <span className="sr-only">Filter by airport</span>
              <select
                value={filters.airport}
                onChange={(event) => {
                  updateFilters({ ...filters, airport: event.target.value });
                }}
                className="w-full mt-1 bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors font-sans appearance-none"
              >
                <option value="">All airports</option>
                {airportOptions.map(({ airport, cityLabel }) => (
                  <option key={airport} value={airport}>
                    {cityLabel} ({airport})
                  </option>
                ))}
              </select>
            </label>
          )}
          {flights.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.bestValueOnly}
                  onChange={(event) => {
                    updateFilters({ ...filters, bestValueOnly: event.target.checked });
                  }}
                  className={CHECKBOX_CLASS}
                />
                <span className="text-sm text-foreground">Best value only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.directOnly}
                  onChange={(event) => {
                    updateFilters({ ...filters, directOnly: event.target.checked });
                  }}
                  className={CHECKBOX_CLASS}
                />
                <span className="text-sm text-foreground">Direct flights only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.vietnamOnly}
                  onChange={(event) => {
                    updateFilters({ ...filters, vietnamOnly: event.target.checked });
                  }}
                  className={CHECKBOX_CLASS}
                />
                <span className="text-sm text-foreground">Vietnam only</span>
              </label>
            </div>
          )}
        </div>

        {flights.length === 0 ? (
          <div className="flex-1 px-4 py-10 text-sm text-muted-foreground">
            No flight searches found in the flights content collection.
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="flex-1 px-4 py-10 text-sm text-muted-foreground">
            No results match the current filters.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-background/95 eyebrow text-muted-foreground backdrop-blur">
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredFlights.map((flight) => (
                  <tr
                    key={flight.id}
                    ref={(element) => {
                      if (element) {
                        listRowRefs.current.set(flight.id, element);
                      } else {
                        listRowRefs.current.delete(flight.id);
                      }
                    }}
                    onClick={() => selectFlight(flight.id, 'calendar')}
                    className={`group cursor-pointer transition-colors relative ${
                      isVietnamAirport(flight.airport)
                        ? VIETNAM_ROW_CLASS
                        : selectedFlightId === flight.id
                          ? 'bg-primary/5'
                          : flight.isCityLowest
                            ? 'bg-[color-mix(in_oklab,gold_12%,var(--color-surface))]'
                            : 'hover:bg-background'
                    } ${selectedFlightId === flight.id ? 'ring-1 ring-inset ring-primary/20' : ''}`}
                  >
                    <td className="px-4 py-4 pb-6">
                      <div className="font-bold text-foreground flex items-center gap-2 min-w-0">
                        <span className="truncate" title={flight.airport}>
                          {flight.cityLabel}
                        </span>
                        {flight.isDirect && (
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5 border border-border bg-background text-muted-foreground"
                            title="Direct"
                          >
                            ✈️
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-variant-numeric tabular-nums">
                        {formatShortDate(flight.outboundDate)} — {formatShortDate(flight.returnDate)}
                      </div>
                      <span className="absolute left-4 bottom-2 text-[10px] text-muted-foreground/70">
                        {formatShortDate(flight.searchedOn)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <div
                        className="font-serif text-lg font-semibold tabular-nums"
                        style={{ color: flight.priceColor }}
                      >
                        {formatPrice(flight.price)}
                      </div>
                      {flight.isCityLowest && (
                        <span className="eyebrow bg-success/10 text-success px-1.5 py-0.5">
                          Best Value
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            <div className="flex flex-wrap gap-4 eyebrow">
              <div className="flex items-center gap-1.5 text-success">
                <span className="w-2 h-2 rounded-full bg-success"></span> Lowest
              </div>
              <div className="flex items-center gap-1.5 text-warning">
                <span className="w-2 h-2 rounded-full bg-warning"></span> Mid-range
              </div>
              <div className="flex items-center gap-1.5 text-error">
                <span className="w-2 h-2 rounded-full bg-error"></span> Highest
              </div>
              <div className="flex items-center gap-1.5 text-[hsl(205_45%_42%)]">
                <span className="w-2 h-2 rounded-full bg-[hsl(205_70%_78%)]"></span> Vietnam
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
                  className="px-3 py-3 text-center eyebrow text-muted-foreground border-r border-border/70 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const hasResults = day.flights.length > 0;
                const isSelectedDay = selectedFlight?.outboundDate === day.date;

                return (
                  <article
                    key={day.date}
                    ref={(element) => {
                      if (element) {
                        calendarDayRefs.current.set(day.date, element);
                      } else {
                        calendarDayRefs.current.delete(day.date);
                      }
                    }}
                    aria-label={`${day.day} ${day.month} ${day.date.slice(0, 4)} with ${day.flights.length} results`}
                    className={`min-h-[12.5rem] p-3 border-r border-b border-border/70 grid gap-3 content-start ${
                      hasResults ? 'bg-primary/[0.04]' : 'bg-surface/40'
                    } ${isSelectedDay ? 'ring-2 ring-inset ring-primary/30 bg-primary/[0.07]' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold tabular-nums">{day.day}</span>
                        <span className="eyebrow text-muted-foreground">
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
                              ref={(element) => {
                                if (element) {
                                  calendarPillRefs.current.set(flight.id, element);
                                } else {
                                  calendarPillRefs.current.delete(flight.id);
                                }
                              }}
                              type="button"
                              onClick={() => selectFlightFromCalendar(flight)}
                              className={`flex items-center justify-between gap-2 min-w-0 min-h-8 px-2.5 py-1 border text-left transition-colors ${
                                isVietnamAirport(flight.airport)
                                  ? VIETNAM_PILL_CLASS
                                  : isSelectedFlight
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border/80 bg-background/80 hover:bg-background'
                              } ${isSelectedFlight ? 'ring-1 ring-primary/30 border-primary' : ''}`}
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
                                style={{ color: flight.priceColor }}
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
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-muted-foreground text-sm">
            Choose a route from recent search results to inspect its price calendar.
          </div>
        )}
      </div>
    </div>
  );
}
