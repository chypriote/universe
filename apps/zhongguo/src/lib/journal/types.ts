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
  major: boolean;
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
  /** Focal point of the Trip Cover in percent, for `object-position`. */
  coverFocus: FocalPoint;
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
  /** Every City of the Day in order, its main City last. */
  cities: { name: string; nameZh: string; major: boolean }[];
  activities: Activity[];
  /** Its train rides, shown after the rest of the Day. */
  rides: string[];
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
  /** Focal point of the Province Cover in percent, for `object-position`; absent on the fallback Photo (centre). */
  focus?: FocalPoint;
  tripCount: number;
  href: string;
};

/** A Visited Province as the admin Home lists it. */
export type VisitedProvince = {
  name: string;
  nameZh: string;
  /** Thumbnail the home map shows: the Province Cover, else its first Photo; null without Photos. */
  photo: string | null;
  /** The picked Province Cover; null when the Province falls back to its first Photo. */
  coverId: number | null;
  /** Focal point of the Province Cover; absent on the fallback Photo. */
  focus?: FocalPoint;
  fallback: boolean;
};

/** A point of a Photo in percent, 0 to 100 on each axis. */
export type FocalPoint = { x: number; y: number };

/** A Photo that can be the cover of a Province. */
export type CoverCandidate = { id: number; name: string; thumb: string; tripTitle: string };

export type SetProvinceCoverResult = { ok: true } | { ok: false; error: 'unknown-province' | 'unknown-photo' };

export type SetProvinceCoverFocusResult =
  | { ok: true }
  | { ok: false; error: 'unknown-province' | 'no-cover' | 'invalid-focus' };

export type ClearProvinceCoverResult = { ok: true } | { ok: false; error: 'unknown-province' };

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

export type AdminTrip = {
  slug: string;
  title: string;
  /** A report is a Trip that has ended; the rest are plans. */
  type: TripType;
  visible: boolean;
  /** A plan has no Days: it can only be switched on or off. */
  hasDays: boolean;
  /** All Photos of the Trip, those on hidden Days included. */
  photos: number;
};

/** A Day as the admin edits it. */
export type AdminDay = {
  id: number;
  date: string;
  /** Position among the visible Days; null while the Day is hidden. */
  number: number | null;
  visible: boolean;
  title: string;
  notes: string;
  city: { id: number; name: string };
  /** The Cities it starts in or passes through before its main City, in order. */
  alsoIn: { id: number; name: string }[];
  province: string;
  /** Ids of its Photos, in order. */
  photoIds: number[];
};

/** A Trip with its Days, as the admin edits it. */
export type AdminTripDetail = {
  slug: string;
  title: string;
  visible: boolean;
  days: AdminDay[];
  /** Every Photo of the Trip, by date and name; those on no Day are in no Day's `photoIds`. */
  photos: AdminPhoto[];
  coverId: number | null;
  /** Focal point of the Trip Cover in percent. */
  coverFocus: FocalPoint;
  /** Ids of the 4 Highlight Photos, in order, or fewer while they are not all picked. */
  highlightIds: number[];
};

export type AdminCity = { id: number; name: string; nameZh: string; province: string; major: boolean };

export type AdminProvince = { id: number; name: string };

/** A City as the Cities admin edits it, with what uses it. */
export type AdminCityDetail = AdminCity & {
  provinceId: number;
  lng: number;
  lat: number;
  photos: number;
  days: number;
  /** Hotels and restaurants. */
  stays: number;
};

/** A Photo of a City, with its Trip. */
export type CityPhoto = AdminPhoto & { trip: { slug: string; title: string } };

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
  | { ok: false; error: 'unknown-trip' | 'unknown-city' | 'invalid-name' | 'unsupported-type' | 'unreadable' | 'no-date' | 'invalid-date' };

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

export type EditCityInput = AddCityInput & { id: number };

export type EditCityResult =
  | { ok: true; city: AdminCityDetail; clearedCovers: string[] }
  | { ok: false; error: 'unknown-city' | 'invalid-name' | 'name-taken' | 'unknown-province' | 'invalid-position' };

export type DeleteCityResult = { ok: true } | { ok: false; error: 'unknown-city' | 'in-use' };

export type SetTripVisibleResult = { ok: true } | { ok: false; error: 'unknown-trip' };

export type SetTripCoverResult =
  | { ok: true }
  | { ok: false; error: 'unknown-trip' | 'unknown-photo' | 'not-landscape' };

export type SetTripCoverFocusResult =
  | { ok: true }
  | { ok: false; error: 'unknown-trip' | 'no-cover' | 'invalid-focus' };

export type SetHighlightPhotosResult =
  | { ok: true }
  | { ok: false; error: 'unknown-trip' | 'unknown-photo' | 'wrong-count' | 'duplicate-photo' | 'not-portrait' };

export type SetDayVisibleResult = { ok: true } | { ok: false; error: 'unknown-day' };

export type EditDayInput = {
  dayId: number;
  title?: string;
  notes?: string;
  /** The main City: the Day's Province follows. */
  cityId?: number;
  /** The Cities it starts in or passes through before its main City, in order; replaces the old list. */
  alsoCityIds?: number[];
};

export type EditDayResult = { ok: true } | { ok: false; error: 'unknown-day' | 'unknown-city' | 'invalid-title' };

export type AddDayInput = {
  /** A calendar date, YYYY-MM-DD; one Day per date and Trip. */
  date: string;
  /** The main City. */
  cityId: number;
  title: string;
  notes?: string;
};

export type AddDayResult =
  | { ok: true; dayId: number }
  | { ok: false; error: 'unknown-trip' | 'invalid-date' | 'date-taken' | 'unknown-city' | 'invalid-title' };

export type SetDayPhotosResult =
  | { ok: true }
  | { ok: false; error: 'unknown-day' | 'unknown-photo' | 'duplicate-photo' };

export type Journal = {
  /** The visible Trips, newest first. */
  listTripCards(): Promise<TripCard[]>;
  /** A visible Trip, or null when it does not exist or is hidden. */
  getTrip(slug: string): Promise<TripPage | null>;
  getGallery(): Promise<Gallery>;
  /** The Visited Provinces of the home map. */
  getHomeMap(): Promise<HomeProvince[]>;
  /** The Visited Provinces with their Province Cover, or the fallback when none is picked. */
  listVisitedProvinces(): Promise<VisitedProvince[]>;
  /** The Photos that can be the cover of a Visited Province; null when it is not one. */
  listCoverCandidates(province: string): Promise<CoverCandidate[] | null>;
  /** Only a candidate Photo can be picked. The row stays when the Province stops being visited. */
  setProvinceCover(province: string, photoId: number): Promise<SetProvinceCoverResult>;
  /** The Province falls back to its first Photo. */
  /** The focal point of the Province Cover, in percent (0 to 100); needs a chosen cover. */
  setProvinceCoverFocus(province: string, x: number, y: number): Promise<SetProvinceCoverFocusResult>;
  clearProvinceCover(province: string): Promise<ClearProvinceCoverResult>;
  /** The Owner login: a signed token for the Owner password. */
  login(password: string): Promise<LoginResult>;
  /** Whether a token is signed by this app's secret and not expired. */
  verifyToken(token: string): Promise<boolean>;
  /** Every Trip, hidden ones too, newest first. */
  listAdminTrips(): Promise<AdminTrip[]>;
  /** A Trip with its Days and Photos, hidden or not; null when it does not exist. */
  getAdminTrip(slug: string): Promise<AdminTripDetail | null>;
  setTripVisible(slug: string, visible: boolean): Promise<SetTripVisibleResult>;
  /** The Trip Cover: a landscape Photo of the Trip. */
  setTripCover(slug: string, photoId: number): Promise<SetTripCoverResult>;
  /** The focal point of the Trip Cover, in percent (0 to 100); needs a chosen cover. */
  setTripCoverFocus(slug: string, x: number, y: number): Promise<SetTripCoverFocusResult>;
  /** The 4 Highlight Photos in order: portrait Photos of the Trip. */
  setHighlightPhotos(slug: string, photoIds: number[]): Promise<SetHighlightPhotosResult>;
  /** A Hidden Day keeps its date and Photos; the visible Days are numbered again. */
  setDayVisible(dayId: number, visible: boolean): Promise<SetDayVisibleResult>;
  editDay(input: EditDayInput): Promise<EditDayResult>;
  /**
   * A new Day on a Trip, plans included. Days stay in date order, the Trip dates become the first and last
   * Day dates, and the Photos of the Trip with that date and no Day join it.
   */
  addDay(tripSlug: string, input: AddDayInput): Promise<AddDayResult>;
  /** The Photos of a Day in order. A Photo on another Day leaves it; one left out stays in the Gallery. */
  setDayPhotos(dayId: number, photoIds: number[]): Promise<SetDayPhotosResult>;
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
  /** Every City by name, with the number of Photos, Days, hotels and restaurants that use it. */
  listAdminCities(): Promise<AdminCityDetail[]>;
  /** The Photos of a City from every Trip, by date and name; null when the City does not exist. */
  listCityPhotos(cityId: number): Promise<CityPhoto[] | null>;
  /** A new Province clears the Province Cover of the old one when that cover is a Photo of the City: `clearedCovers` names those Provinces. */
  editCity(input: EditCityInput): Promise<EditCityResult>;
  /** Refused while a Photo, a Day, a hotel or a restaurant uses the City. */
  deleteCity(cityId: number): Promise<DeleteCityResult>;
};
