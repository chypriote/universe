import React, { useMemo, useState } from 'react';
import type { FlightSearchRow } from '@/lib/flight-utils';
import { priceToColor } from '@/lib/flight-utils';

interface FlightPlannerProps {
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

export default function FlightPlanner({ flights }: FlightPlannerProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    flights[0]?.id ?? null
  );

  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId);

  const priceRange = useMemo(() => {
    if (flights.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = flights.map((flight) => flight.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [flights]);

  const calendarContext = useMemo(() => {
    if (!selectedFlight) {
      return null;
    }

    const anchor = new Date(`${selectedFlight.outboundDate}T12:00:00`);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const monthLabel = anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const airportFlights = flights.filter((flight) => flight.airport === selectedFlight.airport);
    const pricesByDate = new Map<string, number>();
    for (const flight of airportFlights) {
      const existing = pricesByDate.get(flight.outboundDate);
      if (existing === undefined || flight.price < existing) {
        pricesByDate.set(flight.outboundDate, flight.price);
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const monthPrices = [...pricesByDate.values()];
    const monthMin = monthPrices.length ? Math.min(...monthPrices) : priceRange.min;
    const monthMax = monthPrices.length ? Math.max(...monthPrices) : priceRange.max;

    const calendarDays = Array.from({ length: 42 }, (_, index) => {
      const day = index - startDay + 1;
      if (day < 1 || day > daysInMonth) {
        return null;
      }

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const price = pricesByDate.get(dateStr) ?? null;

      return {
        day,
        date: dateStr,
        price,
        priceColor: price !== null ? priceToColor(price, monthMin, monthMax) : null,
      };
    });

    return { monthLabel, calendarDays, monthMin };
  }, [flights, priceRange.max, priceRange.min, selectedFlight]);

  const isSelected = (date: string) => {
    if (!selectedFlight) return false;
    return date === selectedFlight.outboundDate || date === selectedFlight.returnDate;
  };

  const isInRange = (date: string) => {
    if (!selectedFlight) return false;
    return date > selectedFlight.outboundDate && date < selectedFlight.returnDate;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-1 border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border bg-background">
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
              {flights.length} results
            </p>
          )}
        </div>

        {flights.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            No flight searches found in <code className="text-xs">flights.db</code>.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-background/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {flights.map((flight) => (
                  <tr
                    key={flight.id}
                    onClick={() => setSelectedFlightId(flight.id)}
                    className={`group cursor-pointer transition-colors relative ${
                      flight.isCityLowest
                        ? 'bg-[color-mix(in_oklab,gold_12%,var(--color-surface))]'
                        : selectedFlightId === flight.id
                          ? 'bg-primary/5'
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

      <div className="lg:col-span-2 border border-border bg-background p-6 lg:p-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="font-serif text-3xl font-bold mb-1">
              {calendarContext?.monthLabel ?? 'Price Calendar'}
            </h3>
            <p className="text-muted-foreground text-sm font-sans">
              {selectedFlight
                ? `Compare ${selectedFlight.cityLabel} departure prices by date`
                : 'Select a flight result to compare departure prices'}
            </p>
          </div>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold">
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

        {calendarContext ? (
          <div className="grid grid-cols-7 gap-px bg-border border border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-surface py-3 text-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {day}
              </div>
            ))}
            {calendarContext.calendarDays.map((day, index) => (
              <div
                key={index}
                className={`bg-background min-h-[80px] lg:min-h-[110px] p-2 transition-all relative group ${
                  day ? 'cursor-default' : ''
                } ${day && isSelected(day.date) ? 'ring-2 ring-primary z-10' : ''} ${
                  day && isInRange(day.date) ? 'bg-primary/5' : ''
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-sans font-bold ${
                        isSelected(day.date) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {day.day}
                    </span>
                    {day.price !== null && (
                      <div className="mt-auto pt-4 flex flex-col items-center">
                        <span
                          className="font-serif text-lg font-medium tabular-nums"
                          style={{ color: day.priceColor ?? undefined }}
                        >
                          {day.price.toLocaleString('fr-FR')}€
                        </span>
                        {day.price === calendarContext.monthMin && (
                          <div className="w-1 h-1 rounded-full bg-success mt-1"></div>
                        )}
                      </div>
                    )}
                    {isSelected(day.date) && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-sm px-6 py-16 text-center text-muted-foreground text-sm">
            Choose a route from recent search results to inspect its price calendar.
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold mb-1">Flexible Planning</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Prices are loaded from your latest flight searches. Selecting a result highlights the specific window in the price calendar for easy comparison.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start text-sm">
            <button className="w-full bg-primary text-primary-foreground font-sans font-bold text-xs uppercase tracking-[0.2em] py-4 hover:bg-primary-hover transition-colors">
              Continue to Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
