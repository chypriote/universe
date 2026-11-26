import type { ActivityKind, ActivityRating } from './activity-kinds';

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
  /** The route list: the first and last stop and the Major Cities, a City split by a Minor City joined. */
  listed: RouteStop[];
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
  kind: ActivityKind;
  rating: ActivityRating | null;
  description: string;
  /** Yuan per person: null is unknown, 0 is free. */
  price: number | null;
  address: string;
  addressZh: string;
  /** Thumbnail of its main picture, if it has one. */
  picture: string | null;
};

export type TripDay = {
  number: number;
  date: string;
  title: string;
  notes: string;
  city: string;
  /** Every City of the Day in travel order, the last being where it ends. */
  /** The main City is where most of the Day was spent: the page shows it larger. */
  cities: { name: string; nameZh: string; main: boolean }[];
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
  visible: boolean;
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
  /** Every City of the Day in travel order, the last being where it ends; empty for a Day with one City. */
  route: { id: number; name: string }[];
  province: string;
  /** Ids of its Photos, in order. */
  photoIds: number[];
  /** Ids of its Activities, in visit order. */
  activityIds: number[];
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

/** A Trip plan as the admin lists it. */
export type AdminPlan = {
  slug: string;
  title: string;
  visible: boolean;
  /** Whether `npm run china` searches the plan and the Plan page shows prices. */
  searchFlights: boolean;
  days: number;
};

/** A Day of a Trip plan, as the admin edits it. */
export type AdminPlanDay = {
  id: number;
  number: number;
  title: string;
  notes: string;
  city: { id: number; name: string };
  /** Every City of the Day in travel order, the last being where it ends; empty for a Day with one City. */
  route: { id: number; name: string }[];
  province: string;
  /** Ids of its Photos, in order. */
  photoIds: number[];
  /** Ids of its Activities, in visit order. */
  activityIds: number[];
};

/** A Photo of a Trip plan: no date, and on a Day only by choice. */
export type AdminPlanPhoto = Pick<AdminPhoto, 'id' | 'name' | 'url' | 'thumb' | 'orientation' | 'city'>;

export type AdminPlanDetail = {
  slug: string;
  title: string;
  visible: boolean;
  searchFlights: boolean;
  days: AdminPlanDay[];
  photos: AdminPlanPhoto[];
  coverId: number | null;
  /** Focal point of the plan cover in percent. */
  coverFocus: FocalPoint;
  /** Ids of the 4 Highlight Photos, in order, or fewer while they are not all picked. */
  highlightIds: number[];
  /** The Season bits (bit 0 = January) of each Day's Province, in Day order. */
  seasons: number[];
};

export type CreatePlanResult = { ok: true; slug: string } | { ok: false; error: 'invalid-title' | 'slug-taken' };

export type SetPlanResult = { ok: true } | { ok: false; error: 'unknown-plan' };

export type SetPlanCoverResult = { ok: true } | { ok: false; error: 'unknown-plan' | 'unknown-photo' | 'not-landscape' };

export type SetPlanCoverFocusResult = { ok: true } | { ok: false; error: 'unknown-plan' | 'no-cover' | 'invalid-focus' };

export type SetPlanHighlightPhotosResult =
  | { ok: true }
  | { ok: false; error: 'unknown-plan' | 'unknown-photo' | 'wrong-count' | 'duplicate-photo' | 'not-portrait' };

export type SetPlanDayPhotosResult = { ok: true } | { ok: false; error: 'unknown-day' | 'unknown-photo' | 'duplicate-photo' };

export type UploadPlanPhotoInput = {
  /** Slug of the plan. */
  plan: string;
  /** File name, kept as it is. */
  name: string;
  file: ArrayBuffer;
  /** The .webp thumbnail made by the browser. */
  thumb: ArrayBuffer;
  /** Replace the Photo with this name in the plan. */
  overwrite?: boolean;
};

export type UploadPlanPhotoResult =
  | { ok: true; photo: AdminPlanPhoto; replaced: boolean }
  | { ok: false; error: 'unknown-plan' | 'invalid-name' | 'unsupported-type' | 'unreadable' | 'exists' | 'breaks-cover' };

/** The City of a plan Photo; null means no City. */
export type SetPlanPhotoCityResult = { ok: true } | { ok: false; error: 'unknown-photo' | 'unknown-city' };

/** A Photo that is the plan cover or a Highlight Photo cannot be deleted: pick another one first. */
export type DeletePlanPhotoResult = { ok: true } | { ok: false; error: 'unknown-photo' | 'in-use' };

export type AddPlanDayInput = { cityId: number; title: string; notes?: string };

export type AddPlanDayResult =
  | { ok: true; dayId: number }
  | { ok: false; error: 'unknown-plan' | 'unknown-city' | 'invalid-title' };

export type PlanDayResult = { ok: true } | { ok: false; error: 'unknown-day' };

export type AdminCity = { id: number; name: string; nameZh: string; province: string; major: boolean };

export type AdminProvince = { id: number; name: string };

/** An Airport of a City, with the weekdays of a direct flight from Paris (1 = Monday … 7 = Sunday). */
export type Airport = { code: string; directWeekdays: number[] };

/** A Province as the Provinces admin edits it: its Season and its Cities with their Airports. */
export type AdminProvinceDetail = AdminProvince & {
  nameZh: string;
  /** The months of its Season, 1 = January … 12 = December. */
  season: number[];
  cities: { id: number; name: string; nameZh: string; lng: number; lat: number; airports: Airport[] }[];
};

export type SetProvinceSeasonResult = { ok: true } | { ok: false; error: 'unknown-province' | 'invalid-months' };

export type SetAirportInput = Airport & { cityId: number };

export type SetAirportResult =
  | { ok: true; airport: Airport }
  | { ok: false; error: 'invalid-code' | 'unknown-city' | 'code-taken' | 'invalid-weekdays' };

export type DeleteAirportResult = { ok: true } | { ok: false; error: 'unknown-airport' };

/** A City as the Cities admin edits it, with what uses it. */
export type AdminCityDetail = AdminCity & {
  provinceId: number;
  lng: number;
  lat: number;
  photos: number;
  days: number;
  /** Hotels and restaurants. */
  stays: number;
  activities: number;
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

/** What the Owner types for an Activity. Latitude and longitude come together or not at all. */
export type ActivityInput = {
  name: string;
  nameZh: string;
  pinyin: string;
  cityId: number;
  kind: ActivityKind;
  description: string;
  address: string;
  addressZh: string;
  lat: number | null;
  lng: number | null;
  rating: ActivityRating | null;
  /** Yuan per person: null is unknown, 0 is free. */
  price: number | null;
};

/** A picture of an Activity, as the admin shows it. */
export type ActivityPicture = { id: number; name: string; url: string; thumb: string };

export type AdminActivity = ActivityInput & {
  id: number;
  city: string;
  province: string;
  /** Days and Plan Days that list it. */
  days: number;
  /** Its own pictures in order; the first is the main one. */
  pictures: ActivityPicture[];
};

export type UploadActivityPictureInput = {
  activityId: number;
  /** File name with its extension: .jpg, .jpeg, .png or .webp. */
  name: string;
  file: ArrayBuffer;
  thumb: ArrayBuffer;
  /** Replace the picture with this name instead of refusing it. */
  overwrite?: boolean;
};

export type UploadActivityPictureResult =
  | { ok: true; activity: AdminActivity; replaced: boolean }
  | { ok: false; error: 'unknown-activity' | 'invalid-name' | 'unsupported-type' | 'exists' | 'unreadable' };

export type ActivityPicturesResult =
  | { ok: true; activity: AdminActivity }
  | { ok: false; error: 'unknown-activity' | 'unknown-picture' | 'duplicate-picture' };

export type ActivityProblem =
  | 'invalid-name'
  | 'invalid-kind'
  | 'invalid-rating'
  | 'invalid-price'
  | 'invalid-position'
  | 'unknown-city'
  | 'name-taken';

export type AddActivityResult = { ok: true; activity: AdminActivity } | { ok: false; error: ActivityProblem };

export type EditActivityInput = ActivityInput & { id: number };

export type EditActivityResult =
  | { ok: true; activity: AdminActivity }
  | { ok: false; error: ActivityProblem | 'unknown-activity' };

export type DeleteActivityResult = { ok: true } | { ok: false; error: 'unknown-activity' | 'in-use' };

export type CreateTripInput = {
  title: string;
  /** The date of the first copied Day, YYYY-MM-DD. */
  startDate: string;
  /** Plan Days to copy, in any order: they become Days of the Trip in plan order, one date after the other. */
  planDayIds: number[];
};

export type CreateTripResult =
  | { ok: true; slug: string }
  | { ok: false; error: 'invalid-title' | 'invalid-date' | 'slug-taken' | 'unknown-plan-day' };

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
  /** The main City, where most of the Day was spent: the Day's Province follows. */
  cityId?: number;
  /** Every City of the Day in travel order, the main City among them; replaces the old list. One City or none means the main City alone. */
  routeCityIds?: number[];
};

export type EditDayResult = { ok: true } | { ok: false; error: 'unknown-day' | 'unknown-city' | 'invalid-title' | 'main-not-on-route' };

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

export type SetDayActivitiesResult =
  | { ok: true }
  | { ok: false; error: 'unknown-day' | 'unknown-activity' | 'duplicate-activity' };

export type Journal = {
  /** The visible Trips, newest first. */
  listTripCards(): Promise<TripCard[]>;
  /** The visible Trip plans, by title. */
  listPlanCards(): Promise<TripCard[]>;
  /** A visible Trip, or null when it does not exist or is hidden. */
  getTrip(slug: string): Promise<TripPage | null>;
  /** A visible Trip plan, or null when it does not exist or is hidden. */
  getPlan(slug: string): Promise<TripPage | null>;
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
  /** Every Trip plan, hidden ones too, by title. */
  listAdminPlans(): Promise<AdminPlan[]>;
  /** A plan with its numbered Days; null when it does not exist. */
  getAdminPlan(slug: string): Promise<AdminPlanDetail | null>;
  /** A new empty plan. Its slug comes from the title and is unique across Trips and plans. */
  createPlan(title: string): Promise<CreatePlanResult>;
  setPlanVisible(slug: string, visible: boolean): Promise<SetPlanResult>;
  setPlanSearchFlights(slug: string, searchFlights: boolean): Promise<SetPlanResult>;
  /** A new Day at the end of the plan. */
  addPlanDay(slug: string, input: AddPlanDayInput): Promise<AddPlanDayResult>;
  /** The same edit as a Trip Day: title, notes, main City and route. */
  editPlanDay(input: EditDayInput): Promise<EditDayResult>;
  /** The Days after it are numbered again. */
  deletePlanDay(dayId: number): Promise<PlanDayResult>;
  /** Swaps the Day with its neighbour; the first Day cannot go up, nor the last down (nothing happens). */
  movePlanDay(dayId: number, direction: 'up' | 'down'): Promise<PlanDayResult>;
  /**
   * A new Trip, off until the Owner switches it on. The chosen Plan Days become its Days (title, notes, Cities,
   * Activities and train rides; no Photos, no link to the plan), dated from the start date.
   */
  createTrip(input: CreateTripInput): Promise<CreateTripResult>;
  /** The plan cover: a landscape Photo of the plan. */
  setPlanCover(slug: string, photoId: number): Promise<SetPlanCoverResult>;
  /** The focal point of the plan cover, in percent (0 to 100); needs a chosen cover. */
  setPlanCoverFocus(slug: string, x: number, y: number): Promise<SetPlanCoverFocusResult>;
  /** The 4 Highlight Photos of a plan in order: portrait Photos of the plan. */
  setPlanHighlightPhotos(slug: string, photoIds: number[]): Promise<SetPlanHighlightPhotosResult>;
  /** The Photos of a plan Day in order. A Photo on another Day leaves it. */
  setPlanDayPhotos(dayId: number, photoIds: number[]): Promise<SetPlanDayPhotosResult>;
  /** Stores a plan Photo and its thumbnail in the bucket and its row in D1. */
  uploadPlanPhoto(input: UploadPlanPhotoInput): Promise<UploadPlanPhotoResult>;
  setPlanPhotoCity(photoId: number, cityId: number | null): Promise<SetPlanPhotoCityResult>;
  deletePlanPhoto(photoId: number): Promise<DeletePlanPhotoResult>;
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
   * A new Day on a Trip. Days stay in date order, the Trip dates become the first and last
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
  /** Refused while a Photo, a Day, an Activity, a hotel or a restaurant uses the City. Its Airports go with it. */
  deleteCity(cityId: number): Promise<DeleteCityResult>;
  /** Every Activity by City and name, with the number of Days and Plan Days that list it. */
  listAdminActivities(): Promise<AdminActivity[]>;
  /** One name per City. A name, a Chinese name and a pinyin are needed. */
  addActivity(input: ActivityInput): Promise<AddActivityResult>;
  editActivity(input: EditActivityInput): Promise<EditActivityResult>;
  /** Refused while a Day or a Plan Day lists it. */
  deleteActivity(id: number): Promise<DeleteActivityResult>;
  /** The Activities of a Day in visit order, each once; replaces the old list. Any City: a day trip is allowed. */
  setDayActivities(dayId: number, activityIds: number[]): Promise<SetDayActivitiesResult>;
  /** The same for a Plan Day. */
  setPlanDayActivities(dayId: number, activityIds: number[]): Promise<SetDayActivitiesResult>;
  /** The picture goes last. A name already used by the Activity is refused until `overwrite`. */
  uploadActivityPicture(input: UploadActivityPictureInput): Promise<UploadActivityPictureResult>;
  /** The pictures in order, the first being the main one: exactly the Activity's pictures, each once. */
  setActivityPictures(activityId: number, pictureIds: number[]): Promise<ActivityPicturesResult>;
  /** Deletes the picture and its files. */
  deleteActivityPicture(pictureId: number): Promise<ActivityPicturesResult>;
  /** Every Province by name, with its Season and its Cities by name with their Airports. */
  listAdminProvinces(): Promise<AdminProvinceDetail[]>;
  /** Replaces the Season: any set of months, none included. */
  setProvinceSeason(provinceId: number, months: number[]): Promise<SetProvinceSeasonResult>;
  /** Adds the Airport to the City, or saves its direct weekdays. A code belongs to one City. */
  setAirport(input: SetAirportInput): Promise<SetAirportResult>;
  deleteAirport(code: string): Promise<DeleteAirportResult>;
};
