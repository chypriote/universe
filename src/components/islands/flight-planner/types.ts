import type { FlightSearchRow } from '@/lib/flight-utils';

export interface CalendarDay {
  date: string;
  day: number;
  month: string;
  flights: FlightSearchRow[];
}

export interface FlightPlannerProps {
  flights: FlightSearchRow[];
}

export interface AirportOption {
  airport: string;
  cityLabel: string;
}

export interface ListFilters {
  airport: string;
  bestValueOnly: boolean;
  directOnly: boolean;
}

export type ScrollTarget = 'list' | 'calendar';

export interface PriceRange {
  min: number;
  max: number;
}

export interface CalendarSummary {
  rangeLabel: string;
  daysWithResults: number;
  totalDays: number;
}
