import type { FlightSearchRow } from '@/lib/flight-utils';
import type { AirportOption, CalendarDay, CalendarSummary, ListFilters, PriceRange } from './types';

export function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatSearchedOn(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatPrice(price: number): string {
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

export function buildCalendarDays(flights: FlightSearchRow[]): CalendarDay[] {
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

export function filterFlights(flights: FlightSearchRow[], filters: ListFilters): FlightSearchRow[] {
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
    return true;
  });
}

export function getAirportOptions(flights: FlightSearchRow[]): AirportOption[] {
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

export function getPriceRange(flights: FlightSearchRow[]): PriceRange {
  if (flights.length === 0) {
    return { min: 0, max: 0 };
  }

  const prices = flights.map((flight) => flight.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getCalendarSummary(calendarDays: CalendarDay[]): CalendarSummary | null {
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
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return Boolean(filters.airport || filters.bestValueOnly || filters.directOnly);
}
