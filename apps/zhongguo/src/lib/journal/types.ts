export type Orientation = 'landscape' | 'portrait' | 'square';

/** A Photo as a page shows it. */
export type Photo = {
  url: string;
  thumb: string;
  orientation: Orientation;
  /** Its title, else its City, else "On the way, <Province>". */
  caption: string;
  alt: string;
};

export type TripType = 'report' | 'plan';

export type RouteStop = {
  name: string;
  nameZh: string;
  lng: number;
  lat: number;
  /** Numbers of the visible Days spent there. */
  days: number[];
  dayLabel: string;
};

export type Route = {
  /** Every stay in order: a City visited twice appears twice. */
  stops: RouteStop[];
  /** Every City once, for the pins. */
  cities: RouteStop[];
};

export type TripCard = {
  slug: string;
  title: string;
  dates: string;
  description: string;
  type: TripType;
  link: string;
  /** Provinces of the visible Days, for the card map. */
  provinces: string[];
  route: Route;
  /** Thumbnail of the Trip Cover (landscape). */
  cover: string | null;
  /** Thumbnails of the Highlight Photos after the Trip Cover, in order, up to 4 (portrait). */
  highlights: string[];
};

export type Activity = {
  name: string;
  nameZh: string;
  pinyin: string;
};

export type TripDay = {
  number: number;
  date: string;
  title: string;
  notes: string;
  city: string;
  activities: Activity[];
  food: string[];
  photos: Photo[];
};

export type TripCity = {
  name: string;
  nameZh: string;
};

export type TripPage = {
  slug: string;
  title: string;
  dates: string;
  startDate: string;
  destination: string;
  description: string;
  /** Every City of the visible Days, in order of first visit. */
  cities: TripCity[];
  days: TripDay[];
  /** One entry per visible Day, for the calendar of a Trip with Days. */
  planDays: { day: number; city: string }[];
  route: Route;
};

export type GalleryPhoto = Photo & {
  tripSlug: string;
  tripTitle: string;
  photographer: string;
  city: string | null;
  province: string | null;
  /** Number of its visible Day; null when it has none. */
  day: number | null;
  href: string;
};

/** A pin on the Gallery map: a Major City. */
export type GalleryCity = {
  name: string;
  nameZh: string;
  province: string;
  lng: number;
  lat: number;
  tripTitle: string;
  day: number | null;
  href: string;
};

export type Gallery = {
  photos: GalleryPhoto[];
  /** The Visited Provinces. */
  provinces: string[];
  cities: GalleryCity[];
};

export type HomeProvince = {
  name: string;
  nameZh: string;
  /** Thumbnail of the Province Cover, else of the Province's first Photo. */
  photo: string | null;
  tripCount: number;
  href: string;
};

export type Journal = {
  /** The visible Trips, newest first. */
  listTripCards(): Promise<TripCard[]>;
  /** A visible Trip, or null when it does not exist or is hidden. */
  getTrip(slug: string): Promise<TripPage | null>;
  getGallery(): Promise<Gallery>;
  /** The Visited Provinces of the home map. */
  getHomeMap(): Promise<HomeProvince[]>;
};
