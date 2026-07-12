import type { RefObject } from 'react';
import type { FlightSearchRow } from '@/lib/flight-utils';
import { RecentSearchRow } from './RecentSearchRow';
import type { AirportOption, ListFilters } from './types';
import { hasActiveFilters } from './utils';

interface RecentSearchPanelProps {
  flights: FlightSearchRow[];
  filteredFlights: FlightSearchRow[];
  airportOptions: AirportOption[];
  filters: ListFilters;
  selectedFlightId: string | null;
  recentPanelHeight: number | null;
  listRowRefs: RefObject<Map<string, HTMLTableRowElement>>;
  onFilterChange: (filters: ListFilters) => void;
  onSelectFlight: (flightId: string) => void;
}

const checkboxClassName =
  'h-3.5 w-3.5 rounded-sm border-border bg-background text-primary focus:ring-primary/30 focus:ring-offset-0';

export function RecentSearchPanel({
  flights,
  filteredFlights,
  airportOptions,
  filters,
  selectedFlightId,
  recentPanelHeight,
  listRowRefs,
  onFilterChange,
  onSelectFlight,
}: RecentSearchPanelProps) {
  return (
    <div
      className="lg:col-span-1 border border-border bg-surface flex flex-col min-h-0 overflow-hidden"
      style={recentPanelHeight ? { height: recentPanelHeight } : undefined}
    >
      <div className="shrink-0 p-4 border-b border-border bg-background">
        <h2 className="font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-2">
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
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {hasActiveFilters(filters)
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
                onFilterChange({ ...filters, airport: event.target.value });
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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.bestValueOnly}
                onChange={(event) => {
                  onFilterChange({ ...filters, bestValueOnly: event.target.checked });
                }}
                className={checkboxClassName}
              />
              <span className="text-sm text-foreground">Best value only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.directOnly}
                onChange={(event) => {
                  onFilterChange({ ...filters, directOnly: event.target.checked });
                }}
                className={checkboxClassName}
              />
              <span className="text-sm text-foreground">Direct flights only</span>
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
              <tr className="border-b border-border bg-background/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredFlights.map((flight) => (
                <RecentSearchRow
                  key={flight.id}
                  flight={flight}
                  isSelected={selectedFlightId === flight.id}
                  onSelect={() => onSelectFlight(flight.id)}
                  rowRef={(element) => {
                    if (element) {
                      listRowRefs.current.set(flight.id, element);
                    } else {
                      listRowRefs.current.delete(flight.id);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
