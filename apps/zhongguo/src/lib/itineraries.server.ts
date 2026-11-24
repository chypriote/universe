import type { CollectionEntry } from 'astro:content';
import photoManifest from '@/data/photos.json';
import { getCityLngLat, normalizeCityName } from '@/lib/city-coordinates';
import { formatDateRange, getDayDate, type PlanDay } from '@/lib/plan-calendar';
import { getPlaceName } from '@/lib/place-names';

type ItineraryEntry = CollectionEntry<'itineraries'>;

export type PictureFormat = '16:9' | '9:16';

export type TripGalleryPhoto = {
  src: string;
  thumb: string;
  format: PictureFormat;
};

export type TripActivity = {
  name: string;
  nameZh: string;
  pinyin: string;
};

export type TripCity = {
  name: string;
  nameZh: string;
  pinyin: string;
};

export type TripDay = {
  day: number;
  title: string;
  description: string;
  activities: TripActivity[];
  gallery: TripGalleryPhoto[];
  food: string[];
};

export type TripRouteStop = {
  name: string;
  nameZh: string;
  pinyin: string;
  lat: number;
  lng: number;
  days: number[];
  dayLabel: string;
};

export type TripRoute = {
  stops: TripRouteStop[];
  cities: TripRouteStop[];
};

export type TripPageData = {
  title: string;
  dates: string;
  startDate: string;
  destination: string;
  cities: TripCity[];
  description: string;
  days: TripDay[];
  planDays: PlanDay[];
  route: TripRoute;
};

export type TripArchiveEntry = {
  id: string;
  title: string;
  regions: string[];
  dates: string;
  description: string;
  type: 'report' | 'plan';
  photos: string[];
  link: string;
  durationDays: number | null;
  destination: string;
  route: TripRoute;
};

export type GalleryPhoto = {
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  tripSlug: string;
  tripTitle: string;
  city: string | null;
  cityKey: string | null;
  region: string | null;
  day: number | null;
  href: string | null;
  /** Chosen as its province's photo on the home map. */
  cover: boolean;
};

export type GalleryCity = {
  name: string;
  nameZh: string;
  pinyin: string;
  key: string;
  region: string;
  lng: number;
  lat: number;
  tripTitle: string;
  day: number;
  href: string;
};

export type GalleryArchive = {
  photos: GalleryPhoto[];
  regions: string[];
  cities: GalleryCity[];
};

type TripPhoto = { slug: string; name: string; width: number; height: number; city?: string; cover?: boolean };

const photosBaseUrl = (import.meta.env.PHOTOS_URL ?? process.env.PHOTOS_URL ?? '').replace(/\/$/, '');
if (!photosBaseUrl) {
  throw new Error('PHOTOS_URL is not set. It is the public base URL of the photo bucket.');
}

const tripPhotos: Record<string, TripPhoto> = Object.fromEntries(
  Object.entries(photoManifest).flatMap(([slug, photos]) =>
    photos.map((photo) => [`/trips/${slug}/${photo.name}`, { slug, ...photo }]),
  ),
);

function photoUrl(photo: TripPhoto): string {
  return `${photosBaseUrl}/trips/${photo.slug}/${encodeURIComponent(photo.name)}`;
}

function thumbUrl(photo: TripPhoto): string {
  return `${photosBaseUrl}/thumbs/${photo.slug}/${encodeURIComponent(photo.name)}.webp`;
}

function formatTripDates(release: ItineraryEntry['data']['released_itinerary']): string {
  if (!release.start_date || !release.end_date) return 'Dates to be decided';
  return formatDateRange(release.start_date, release.end_date);
}

function getOrderedCities(entry: ItineraryEntry): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];

  for (const day of entry.data.days) {
    if (!seen.has(day.main_city)) {
      seen.add(day.main_city);
      cities.push(day.main_city);
    }
  }

  return cities;
}

function formatDayLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }

    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    if (current !== undefined) {
      start = current;
      prev = current;
    }
  }

  return parts.join(', ');
}

function toNamedPlace(name: string) {
  const place = getPlaceName(name);
  return {
    name,
    nameZh: place.zh,
    pinyin: place.pinyin,
  };
}

function toRouteStop(name: string, days: number[]): TripRouteStop {
  const [lng, lat] = getCityLngLat(name);
  return {
    ...toNamedPlace(name),
    lat,
    lng,
    days,
    dayLabel: formatDayLabel(days),
  };
}

export function buildTripRoute(entry: ItineraryEntry): TripRoute {
  const stops: TripRouteStop[] = [];

  for (const day of entry.data.days) {
    const last = stops.at(-1);
    if (last && last.name === day.main_city) {
      last.days.push(day.day_number);
      last.dayLabel = formatDayLabel(last.days);
      continue;
    }

    stops.push(toRouteStop(day.main_city, [day.day_number]));
  }

  const uniqueByKey = new Map<string, TripRouteStop>();
  for (const stop of stops) {
    const key = normalizeCityName(stop.name);
    const existing = uniqueByKey.get(key);
    if (!existing) {
      uniqueByKey.set(key, {
        ...stop,
        days: [...stop.days],
      });
      continue;
    }

    existing.days.push(...stop.days);
    existing.dayLabel = formatDayLabel(existing.days);
  }

  return {
    stops,
    cities: [...uniqueByKey.values()],
  };
}

function tripPhotoFolder(slug: string): string {
  return `/trips/${slug}/`;
}

function alternateFilenames(filename: string): string[] {
  const alts = new Set<string>();
  alts.add(filename.replace(/ \(\d+\)(\.[^.]+)$/, '$1'));
  alts.add(filename.replace(/_1(\.[^.]+)$/, '$1'));
  alts.delete(filename);
  return [...alts];
}

function resolveTripPhoto(slug: string, filename: string): TripPhoto | undefined {
  const folder = tripPhotoFolder(slug);
  const wantNames = [filename, ...alternateFilenames(filename)];

  for (const [path, photo] of Object.entries(tripPhotos)) {
    if (!path.includes(folder)) continue;
    if (wantNames.includes(photo.name)) return photo;
  }
}

function toTripPhoto(photo: TripPhoto, format: PictureFormat): TripGalleryPhoto {
  return { src: photoUrl(photo), thumb: thumbUrl(photo), format };
}

function formatFromMetadata(photo: TripPhoto): PictureFormat {
  return photo.width >= photo.height ? '16:9' : '9:16';
}

function getTripPhotos(slug: string, filenames: string[]): string[] {
  const selected = filenames
    .map((filename) => resolveTripPhoto(slug, filename))
    .filter((image): image is TripPhoto => Boolean(image));
  const images =
    selected.length > 0
      ? selected
      : listTripPhotos(slug)
          .map((entry) => entry.image)
          .slice(0, 5);

  return images.map(thumbUrl);
}

/** Parse capture time from common camera/export filename patterns. */
function parsePhotoTakenAt(filename: string): number | null {
  const name = filename.replace(/^.*[/\\]/, '');

  // 2025-03-29-09-02.jpg
  const dashed = name.match(
    /^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})(?:\.\w+)?$/,
  );
  if (dashed) {
    const [, y, mo, d, h, mi] = dashed;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi);
  }

  // IMG_20260527_002709.jpg / IMG_20260527_002709_1.jpg / IMG_20260524_140624 (1).jpg
  const imgUnderscore = name.match(
    /^IMG_(\d{4})(\d{2})(\d{2})(?:_(\d{2})(\d{2})(\d{2}))?/,
  );
  if (imgUnderscore) {
    const [, y, mo, d, h = '00', mi = '00', s = '00'] = imgUnderscore;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  }

  // IMG20260518143335.jpg / IMG20260519163124_01.jpg
  const imgCompact = name.match(/^IMG(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (imgCompact) {
    const [, y, mo, d, h, mi, s] = imgCompact;
    return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  }

  // mmexport1779406449435_1.jpg (WeChat unix ms)
  const mmexport = name.match(/^mmexport(\d{10,13})/);
  if (mmexport) {
    const raw = mmexport[1];
    const ms = raw.length <= 10 ? +raw * 1000 : +raw;
    return ms;
  }

  return null;
}

function compareTripPhotoPaths(pathA: string, pathB: string): number {
  const takenA = parsePhotoTakenAt(pathA);
  const takenB = parsePhotoTakenAt(pathB);

  if (takenA !== null && takenB !== null && takenA !== takenB) {
    return takenA - takenB;
  }
  if (takenA !== null && takenB === null) return -1;
  if (takenA === null && takenB !== null) return 1;
  return pathA.localeCompare(pathB);
}

function listTripPhotos(slug: string): { path: string; image: TripPhoto }[] {
  const folder = tripPhotoFolder(slug);

  return Object.entries(tripPhotos)
    .filter(([path]) => path.includes(folder))
    .sort(([pathA], [pathB]) => compareTripPhotoPaths(pathA, pathB))
    .map(([path, image]) => ({ path, image }));
}

function photoDateKey(path: string): string | null {
  const name = path.replace(/^.*[/\\]/, '');
  const dashed = name.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) {
    return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  }

  const img = name.match(/IMG_?(\d{4})(\d{2})(\d{2})/);
  if (img) {
    return `${img[1]}-${img[2]}-${img[3]}`;
  }

  return null;
}

function regionForCity(
  cities: ItineraryEntry['data']['cities'],
  cityName: string,
): string | null {
  const key = normalizeCityName(cityName);
  return cities.find((city) => normalizeCityName(city.name) === key)?.region ?? null;
}

export async function buildGalleryArchive(
  entries: ItineraryEntry[],
): Promise<GalleryArchive> {
  const photos: GalleryPhoto[] = [];
  const citiesByKey = new Map<string, GalleryCity>();

  const ordered = [...entries].sort((a, b) =>
    (b.data.released_itinerary.start_date ?? '').localeCompare(
      a.data.released_itinerary.start_date ?? '',
    ),
  );

  for (const entry of ordered) {
    const { data } = entry;
    const slug = data.slug;
    const startDate = data.released_itinerary.start_date ?? '';
    const days = data.days.map((day) => ({
      day: day.day_number,
      city: day.main_city,
      region: regionForCity(data.cities, day.main_city),
      date: getDayDate(startDate, day.day_number),
    }));

    for (const { path, image } of listTripPhotos(slug)) {
      const dateKey = photoDateKey(path);
      const dateMatch = dateKey ? days.find((day) => day.date === dateKey) : undefined;
      // A city set on the photo in photos.json wins over the city of its date.
      const cityMatch = image.city
        ? days.find((day) => normalizeCityName(day.city) === normalizeCityName(image.city!))
        : undefined;
      const match = cityMatch ?? dateMatch;
      const href = match ? `/trips/${slug}#day-${match.day}` : `/trips/${slug}`;
      const place = match?.city ?? data.title;
      const index = photos.length + 1;
      const cityKey = match?.city ? normalizeCityName(match.city) : null;

      photos.push({
        url: photoUrl(image),
        thumb: thumbUrl(image),
        alt: `${place} — ${data.title}, photo ${index}`,
        photographer: 'Nico',
        tripSlug: slug,
        tripTitle: data.title,
        city: match?.city ?? null,
        cityKey,
        region: match?.region ?? null,
        day: match?.day ?? null,
        href,
        cover: image.cover === true,
      });

      if (!match?.city || !match.region || !cityKey) continue;
      if (citiesByKey.has(cityKey)) continue;

      const firstInCity = days.find((day) => normalizeCityName(day.city) === cityKey);
      const pinDay = firstInCity?.day ?? match.day;
      const [lng, lat] = getCityLngLat(match.city);
      citiesByKey.set(cityKey, {
        ...toNamedPlace(match.city),
        key: cityKey,
        region: match.region,
        lng,
        lat,
        tripTitle: data.title,
        day: pinDay,
        href: `/trips/${slug}#day-${pinDay}`,
      });
    }
  }

  const cities = [...citiesByKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  const regions = [...new Set(cities.map((city) => city.region))].sort((a, b) =>
    a.localeCompare(b),
  );

  return { photos, regions, cities };
}

function getDayGallery(slug: string, dayDate: string): TripGalleryPhoto[] {
  const folder = tripPhotoFolder(slug);

  return Object.entries(tripPhotos)
    .filter(([path]) => path.includes(folder) && path.includes(dayDate))
    .map(([, photo]) => toTripPhoto(photo, formatFromMetadata(photo)))
    .sort((a, b) => a.src.localeCompare(b.src));
}

function getPictures(
  slug: string,
  pictures: { url: string; format: PictureFormat }[],
): TripGalleryPhoto[] {
  return pictures.flatMap((picture) => {
    const filename = picture.url.split('/').pop() ?? '';
    const image = resolveTripPhoto(slug, filename);
    return image ? [toTripPhoto(image, picture.format)] : [];
  });
}

function getAttractionPictures(
  slug: string,
  attractions: ItineraryEntry['data']['days'][number]['attractions'],
): TripGalleryPhoto[] {
  return getPictures(slug, attractions.flatMap((attraction) => attraction.pictures));
}

function getDayFood(
  cities: ItineraryEntry['data']['cities'],
  mainCity: string,
): string[] {
  const city = cities.find((entry) => entry.name === mainCity);
  if (!city) {
    return [];
  }

  return city.restaurants.flatMap((restaurant) => restaurant.suggested_dishes);
}

function formatTrainTrip(
  trip: ItineraryEntry['data']['days'][number]['train_trips'][number],
): TripActivity {
  const from = getPlaceName(trip.outgoing_city);
  const to = getPlaceName(trip.destination_city);

  return {
    name: `${trip.outgoing_city} → ${trip.destination_city} (${trip.departure_time} – ${trip.arrival_time})`,
    nameZh: `${from.zh} → ${to.zh}`,
    pinyin: `${from.pinyin} → ${to.pinyin}`,
  };
}

function formatAttraction(name: string): TripActivity {
  const place = getPlaceName(name);
  return {
    name,
    nameZh: place.zh,
    pinyin: place.pinyin,
  };
}

// Archive cards leave the day count out: the dates already give the length.
function buildArchiveDescription(cities: string[]): string {
  if (cities.length === 0) return 'Planned trip. Route and dates are not set yet.';
  return `A journey across ${cities.join(', ')}.`;
}

function buildTripDescription(entry: ItineraryEntry, cities: string[]): string {
  if (cities.length === 0 || !entry.data.suggested_duration_days) {
    return 'Planned trip. Route and dates are not set yet.';
  }
  const cityList = cities.join(', ');
  return `A ${entry.data.suggested_duration_days}-day journey across ${cityList}.`;
}

export async function buildTripPage(entry: ItineraryEntry): Promise<TripPageData> {
  const { data } = entry;
  const slug = data.slug;
  const orderedCities = getOrderedCities(entry);
  const destination = data.cities[0]?.country ?? 'China';

  return {
    title: data.title,
    dates: formatTripDates(data.released_itinerary),
    startDate: data.released_itinerary.start_date ?? '',
    destination,
    cities: orderedCities.map(toNamedPlace),
    description: buildTripDescription(entry, orderedCities),
    route: buildTripRoute(entry),
    planDays: data.days.map((day) => ({
      day: day.day_number,
      city: day.main_city,
    })),
    days: await Promise.all(data.days.map(async (day) => {
      const dayDate = getDayDate(data.released_itinerary.start_date ?? '', day.day_number);
      const dayPictures = await getPictures(slug, day.pictures);
      const assetGallery =
        dayPictures.length > 0 ? [] : await getDayGallery(slug, dayDate);
      const attractionGallery =
        dayPictures.length + assetGallery.length > 0
          ? []
          : await getAttractionPictures(slug, day.attractions);

      return {
        day: day.day_number,
        title: day.title,
        description: day.notes,
        activities: [
          ...day.attractions.map((attraction) => formatAttraction(attraction.name)),
          ...day.train_trips.map(formatTrainTrip),
        ],
        gallery:
          dayPictures.length > 0
            ? dayPictures
            : assetGallery.length > 0
              ? assetGallery
              : attractionGallery,
        food: getDayFood(data.cities, day.main_city),
      };
    })),
  };
}

export function isPublishedItinerary(entry: ItineraryEntry): boolean {
  return !entry.id.startsWith('example');
}

function getTripType(entry: ItineraryEntry): 'report' | 'plan' {
  const end = entry.data.released_itinerary.end_date;
  if (!end) return 'plan';
  const endDate = new Date(`${end}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today ? 'report' : 'plan';
}

export async function buildTripArchiveEntry(
  entry: ItineraryEntry,
): Promise<TripArchiveEntry> {
  const { data } = entry;
  const orderedCities = getOrderedCities(entry);

  return {
    id: data.slug,
    title: data.title,
    regions: [...new Set(data.cities.map(city => city.region))],
    dates: formatTripDates(data.released_itinerary),
    description: buildArchiveDescription(orderedCities),
    type: getTripType(entry),
    photos: await getTripPhotos(data.slug, data.released_itinerary.pictures),
    link: `/trips/${data.slug}`,
    durationDays: data.suggested_duration_days ?? null,
    destination: data.cities[0]?.country ?? 'China',
    route: buildTripRoute(entry),
  };
}
