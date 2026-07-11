import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlightSearchRow } from '@/lib/flight-utils';
import type { ListFilters, ScrollTarget } from './types';
import {
  buildCalendarDays,
  filterFlights,
  getAirportOptions,
  getCalendarSummary,
  getPriceRange,
} from './utils';

export function useFlightPlanner(flights: FlightSearchRow[]) {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    flights[0]?.id ?? null
  );
  const [filters, setFilters] = useState<ListFilters>({
    airport: '',
    bestValueOnly: false,
    directOnly: false,
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
  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId) ?? null;
  const priceRange = useMemo(() => getPriceRange(flights), [flights]);
  const calendarDays = useMemo(() => buildCalendarDays(flights), [flights]);
  const calendarSummary = useMemo(() => getCalendarSummary(calendarDays), [calendarDays]);

  const selectFlight = (flightId: string, scrollTo: ScrollTarget) => {
    pendingScrollTarget.current = scrollTo;
    setSelectedFlightId(flightId);
  };

  const ensureSelectedInList = (nextFlights: FlightSearchRow[]) => {
    if (!nextFlights.some((flight) => flight.id === selectedFlightId)) {
      setSelectedFlightId(nextFlights[0]?.id ?? null);
    }
  };

  const updateFilters = (nextFilters: ListFilters) => {
    setFilters(nextFilters);
    ensureSelectedInList(filterFlights(flights, nextFilters));
  };

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

    if (
      nextFilters.airport !== filters.airport ||
      nextFilters.bestValueOnly !== filters.bestValueOnly ||
      nextFilters.directOnly !== filters.directOnly
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

  return {
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
  };
}
