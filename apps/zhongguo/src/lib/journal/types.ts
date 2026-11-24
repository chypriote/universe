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

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/** A Photo as the admin lists it. */
export type AdminPhoto = {
  id: number;
  name: string;
  url: string;
  thumb: string;
  orientation: Orientation;
  date: string;
  /** Number of its visible Day; null when it has none. */
  day: number | null;
  title: string | null;
  /** Its City, or null for an On the way photo. */
  city: { id: number; name: string } | null;
  /** The Province of its City, or the one an On the way photo names. */
  province: string | null;
  onTheWay: boolean;
};

export type AdminTrip = { slug: string; title: string };

export type AdminCity = { id: number; name: string; nameZh: string; province: string; major: boolean };

export type AdminProvince = { id: number; name: string };

/** What a Photo is a cover of: it cannot be deleted while it is one. */
export type CoverRef = {
  /** Identifies the cover when a replacement is picked. */
  key: string;
  kind: 'trip-cover' | 'highlight' | 'province-cover';
  /** For example "Trip Cover of Sichuan". */
  label: string;
  /** Where the cover is set. */
  href: string;
};

export type PhotoChoice = { id: number; name: string; thumb: string };

export type KeptPhoto = {
  id: number;
  name: string;
  covers: (CoverRef & { replacements: PhotoChoice[] })[];
};

export type UploadPhotoInput = {
  /** Slug of the Trip. */
  trip: string;
  /** File name, kept as it is (spaces and accents included). */
  name: string;
  file: ArrayBuffer;
  /** The .webp thumbnail made by the browser. */
  thumb: ArrayBuffer;
  /** Used when neither EXIF nor the file name gives a date (YYYY-MM-DD). */
  date?: string;
  title?: string;
  cityId?: number;
  /** Replace the Photo with this name in the Trip, keeping everything set by hand. */
  overwrite?: boolean;
};

export type UploadPhotoResult =
  | { ok: true; photo: AdminPhoto; replaced: boolean }
  | { ok: false; error: 'exists' }
  | { ok: false; error: 'breaks-cover'; covers: CoverRef[] }
  | { ok: false; error: 'unknown-trip' | 'unknown-city' | 'invalid-name' | 'unsupported-type' | 'unreadable' | 'no-date' };

/** Where a Photo was taken: a City, or on the way (with an optional Province). */
export type PhotoPlace = { cityId: number } | { onTheWay: true; provinceId?: number };

export type EditPhotosInput = {
  ids: number[];
  /** Setting one clears the other. */
  place?: PhotoPlace;
  /** YYYY-MM-DD. */
  date?: string;
  /** Empty clears it. */
  title?: string;
};

export type EditPhotosResult =
  | { ok: true; updated: number }
  | { ok: false; error: 'unknown-photo' | 'unknown-city' | 'unknown-province' | 'invalid-date' };

export type DeletePhotosInput = {
  ids: number[];
  /** Photo id to put in place of a deleted cover, by cover key. */
  replacements?: Record<string, number>;
};

export type DeletePhotosResult = {
  deleted: number[];
  /** Covers with no valid replacement: not deleted. */
  kept: KeptPhoto[];
};

export type AddCityInput = {
  name: string;
  nameZh: string;
  provinceId: number;
  lng: number;
  lat: number;
  major: boolean;
};

export type AddCityResult =
  | { ok: true; city: AdminCity }
  | { ok: false; error: 'invalid-name' | 'name-taken' | 'unknown-province' | 'invalid-position' };

export type Journal = {
  /** The visible Trips, newest first. */
  listTripCards(): Promise<TripCard[]>;
  /** A visible Trip, or null when it does not exist or is hidden. */
  getTrip(slug: string): Promise<TripPage | null>;
  getGallery(): Promise<Gallery>;
  /** The Visited Provinces of the home map. */
  getHomeMap(): Promise<HomeProvince[]>;
  /** The Owner login: a signed token for the Owner password. */
  login(password: string): Promise<LoginResult>;
  /** Whether a token is signed by this app's secret and not expired. */
  verifyToken(token: string): Promise<boolean>;
  /** Every Trip, hidden ones too, newest first. */
  listAdminTrips(): Promise<AdminTrip[]>;
  /** The Photos of a Trip by date and name; null when the Trip does not exist. */
  listAdminPhotos(slug: string): Promise<AdminPhoto[] | null>;
  listCities(): Promise<AdminCity[]>;
  listProvinces(): Promise<AdminProvince[]>;
  /** Stores a Photo and its thumbnail in the bucket and its row in D1. */
  uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult>;
  editPhotos(input: EditPhotosInput): Promise<EditPhotosResult>;
  /** Deletes the Photos that are not covers (or whose covers get a valid replacement). */
  deletePhotos(input: DeletePhotosInput): Promise<DeletePhotosResult>;
  addCity(input: AddCityInput): Promise<AddCityResult>;
};
