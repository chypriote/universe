import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlightSearchRow } from '@/lib/flight-utils';
import { priceToColor } from '@/lib/flight-utils';

interface FlightPlannerProps {
  flights: FlightSearchRow[];
}

interface CalendarDay {
  date: string;
  day: number;
  month: string;
  flights: FlightSearchRow[];
}

function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatSearchedOn(dateStr: string): string {
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

export function FlightPlanner({ flights }: FlightPlannerProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    flights[0]?.id ?? null
  );
  const [airportFilter, setAirportFilter] = useState('');
  const [bestValueOnly, setBestValueOnly] = useState(false);
  const listRowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const calendarDayRefs = useRef(new Map<string, HTMLElement>());
  const calendarPillRefs = useRef(new Map<string, HTMLButtonElement>());
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const pendingScrollTarget = useRef<'list' | 'calendar' | null>(null);
  const [recentPanelHeight, setRecentPanelHeight] = useState<number | null>(null);

  const selectFlight = (flightId: string, scrollTo: 'list' | 'calendar') => {
    pendingScrollTarget.current = scrollTo;
    setSelectedFlightId(flightId);
  };

  const selectFlightFromCalendar = (flight: FlightSearchRow) => {
    if (airportFilter && flight.airport !== airportFilter) {
      setAirportFilter('');
    }
    if (bestValueOnly && !flight.isCityLowest) {
      setBestValueOnly(false);
    }
    selectFlight(flight.id, 'list');
  };

  const filterFlights = (
    airport: string,
    bestOnly: boolean,
    source: FlightSearchRow[] = flights
  ) =>
    source.filter((flight) => {
      if (airport && flight.airport !== airport) {
        return false;
      }
      if (bestOnly && !flight.isCityLowest) {
        return false;
      }
      return true;
    });

  const ensureSelectedInList = (nextFlights: FlightSearchRow[]) => {
    if (!nextFlights.some((flight) => flight.id === selectedFlightId)) {
      setSelectedFlightId(nextFlights[0]?.id ?? null);
    }
  };

  const airportOptions = useMemo(() => {
    const byAirport = new Map<string, string>();
    for (const flight of flights) {
      if (!byAirport.has(flight.airport)) {
        byAirport.set(flight.airport, flight.cityLabel);
      }
    }

    return [...byAirport.entries()]
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([airport, cityLabel]) => ({ airport, cityLabel }));
  }, [flights]);

  const filteredFlights = useMemo(
    () => filterFlights(airportFilter, bestValueOnly),
    [airportFilter, bestValueOnly, flights]
  );

  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId);

  const priceRange = useMemo(() => {
    if (flights.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = flights.map((flight) => flight.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [flights]);

  const calendarDays = useMemo(() => buildCalendarDays(flights), [flights]);

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
      totalDays: calendarDays.length,
    };
  }, [calendarDays]);

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
  }, [selectedFlightId, airportFilter, bestValueOnly, filteredFlights, flights]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      <div
        className="lg:col-span-1 border border-border bg-surface flex flex-col min-h-0 overflow-hidden"
        style={recentPanelHeight ? { height: recentPanelHeight } : undefined}
      >
        <div className="shrink-0 p-4 border-b border-border bg-background">
          <h2 className="font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Search Results
          </h2>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            One entry per airport-date combo, ordered from cheapest to priciest.
          </p>
          {flights.length > 0 && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {airportFilter || bestValueOnly
                ? `${filteredFlights.length} of ${flights.length} results`
                : `${flights.length} results`}
            </p>
          )}
          {airportOptions.length > 0 && (
            <label className="mt-4 block">
              <span className="sr-only">Filter by airport</span>
              <select
                value={airportFilter}
                onChange={(event) => {
                  const nextAirport = event.target.value;
                  setAirportFilter(nextAirport);
                  ensureSelectedInList(filterFlights(nextAirport, bestValueOnly));
                }}
                className="w-full mt-1 bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors font-sans appearance-none"
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
            <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bestValueOnly}
                onChange={(event) => {
                  const nextBestValueOnly = event.target.checked;
                  setBestValueOnly(nextBestValueOnly);
                  ensureSelectedInList(filterFlights(airportFilter, nextBestValueOnly));
                }}
                className="h-3.5 w-3.5 rounded-sm border-border bg-background text-primary focus:ring-primary/30 focus:ring-offset-0"
              />
              <span className="text-sm text-foreground">Best value only</span>
            </label>
          )}
        </div>

        {flights.length === 0 ? (
          <div className="flex-1 px-4 py-10 text-sm text-muted-foreground">
            No flight searches found in <code className="text-xs">flights.db</code>.
          </div>
        ) : filteredFlights.length === 0 ? (
          <div className="flex-1 px-4 py-10 text-sm text-muted-foreground">
            No results match the current filters.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-background/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
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
                      selectedFlightId === flight.id
                        ? 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                        : flight.isCityLowest
                          ? 'bg-[color-mix(in_oklab,gold_12%,var(--color-surface))]'
                          : 'hover:bg-background'
                    }`}
                  >
                    <td className="px-4 py-4 pb-6">
                      <div className="font-bold text-foreground flex items-center gap-2 min-w-0">
                        <span className="truncate" title={flight.airport}>
                          {flight.cityLabel}
                        </span>
                        {flight.isDirect && (
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground"
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
                        {formatSearchedOn(flight.searchedOn)}
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
                        <span className="text-[9px] uppercase tracking-tighter bg-success/10 text-success px-1.5 py-0.5 font-bold">
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
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="px-3 py-3 text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground border-r border-border/70 last:border-r-0"
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
                              ref={(element) => {
                                if (element) {
                                  calendarPillRefs.current.set(flight.id, element);
                                } else {
                                  calendarPillRefs.current.delete(flight.id);
                                }
                              }}
                              type="button"
                              onClick={() => selectFlightFromCalendar(flight)}
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