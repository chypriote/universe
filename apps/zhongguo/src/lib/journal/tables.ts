import type { TripType } from './types';

/**
 * The tables of a kind of Trip in D1, shared by public pages, Day edit and Day Activities. A Trip plan has the same shape as a Trip (Days, Cities, Photos) in tables of its own
 * (ADR 0003): no dates, no hidden Days, no food, so those columns are constants.
 */
export type TripTables = {
  type: TripType;
  trips: string;
  /** The Trip id column of the other tables. */
  fk: string;
  days: string;
  dayCities: string;
  dayPhotos: string;
  photos: string;
  highlights: string;
  dayActivities: string;
  rides: string;
  /** SQL for the columns plans do not have. */
  startDate: string;
  endDate: string;
  description: string;
  dayDate: string;
  dayVisible: string;
  photoDate: string;
  base: string;
};

export const TRIP_TABLES: TripTables = {
  type: 'report',
  trips: 'trips',
  fk: 'trip_id',
  days: 'days',
  dayCities: 'day_cities',
  dayPhotos: 'day_photos',
  photos: 'photos',
  highlights: 'highlight_photos',
  dayActivities: 'day_activities',
  rides: 'day_train_rides',
  startDate: 'trips.start_date',
  endDate: 'trips.end_date',
  description: 'description',
  dayDate: 'days.date',
  dayVisible: 'days.visible',
  photoDate: 'photos.date',
  base: '/trips',
};

export const PLAN_TABLES: TripTables = {
  type: 'plan',
  trips: 'plans',
  fk: 'plan_id',
  days: 'plan_days',
  dayCities: 'plan_day_cities',
  dayPhotos: 'plan_day_photos',
  photos: 'plan_photos',
  highlights: 'plan_highlight_photos',
  dayActivities: 'plan_day_activities',
  rides: 'plan_day_train_rides',
  startDate: 'NULL',
  endDate: 'NULL',
  description: 'NULL',
  dayDate: "''",
  dayVisible: '1',
  photoDate: "''",
  base: '/plans',
};
