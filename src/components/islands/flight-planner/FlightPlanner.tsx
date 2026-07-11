import type { FlightPlannerProps } from './types';
import { PriceCalendarPanel } from './PriceCalendarPanel';
import { RecentSearchPanel } from './RecentSearchPanel';
import { useFlightPlanner } from './useFlightPlanner';

export function FlightPlanner({ flights }: FlightPlannerProps) {
  const {
    airportOptions,
    calendarDayRefs,
    calendarDays,
    calendarPanelRef,
    calendarPillRefs,
    calendarSummary,
    filteredFlights,
    filters,
    listRowRefs,
    priceRange,
    recentPanelHeight,
    selectFlight,
    selectFlightFromCalendar,
    selectedFlight,
    selectedFlightId,
    updateFilters,
  } = useFlightPlanner(flights);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      <RecentSearchPanel
        flights={flights}
        filteredFlights={filteredFlights}
        airportOptions={airportOptions}
        filters={filters}
        selectedFlightId={selectedFlightId}
        recentPanelHeight={recentPanelHeight}
        listRowRefs={listRowRefs}
        onFilterChange={updateFilters}
        onSelectFlight={(flightId) => selectFlight(flightId, 'calendar')}
      />
      <PriceCalendarPanel
        calendarDays={calendarDays}
        calendarSummary={calendarSummary}
        selectedFlight={selectedFlight}
        selectedFlightId={selectedFlightId}
        priceRange={priceRange}
        calendarPanelRef={calendarPanelRef}
        calendarDayRefs={calendarDayRefs}
        calendarPillRefs={calendarPillRefs}
        onSelectFlight={selectFlightFromCalendar}
      />
    </div>
  );
}
