import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { getCityLngLat, normalizeCityName } from '@/lib/city-coordinates';

type ItineraryEntry = CollectionEntry<'itineraries'>;

export type PictureFormat = '16:9' | '9:16';

export type TripGalleryPhoto = {
  src: string;
  format: PictureFormat;
};

export type TripDay = {
  day: number;
  title: string;
  description: string;
  activities: string[];
  gallery: TripGalleryPhoto[];
  food: string[];
};

export type TripRouteStop = {
  name: string;
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
  destination: string;
  cities: string;
  description: string;
  days: TripDay[];
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
};

export type GalleryPhoto = {
  url: string;
  srcset: string;
  alt: string;
  photographer: string;
  tripSlug: string;
  tripTitle: string;
  city: string | null;
  cityKey: string | null;
  region: string | null;
  day: number | null;
  href: string | null;
};

export type GalleryCity = {
  name: string;
  key: string;
  region: string;
  tripTitle: string;
  day: number;
  href: string;
};

export type GalleryArchive = {
  photos: GalleryPhoto[];
  regions: string[];
  cities: GalleryCity[];
};

const tripImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/trips/**/*.{jpg,jpeg,png,webp}',
  { eager: true },
);

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return `${dateFormatter.format(start)} — ${dateFormatter.format(end)}`;
}

function getDayDate(startDate: string, dayNumber: number): string {
  const [year, month, day] = startDate.split('-').map(Number);
  const date = new Date(year, month - 1, day + dayNumber - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function toRouteStop(name: string, days: number[]): TripRouteStop {
  const [lng, lat] = getCityLngLat(name);
  return {
    name,
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

function getTripPhotoPrefix(slug: string): string {
  return `/src/assets/trips/${slug}/`;
}

function resolveTripPhoto(slug: string, filename: string): ImageMetadata | undefined {
  const path = `${getTripPhotoPrefix(slug)}${filename}`;
  return tripImages[path]?.default;
}

function formatFromMetadata(image: ImageMetadata): PictureFormat {
  return image.width >= image.height ? '16:9' : '9:16';
}

function getTripPhotos(slug: string, filenames: string[]): string[] {
  return filenames
    .map((filename) => resolveTripPhoto(slug, filename)?.src)
    .filter((src): src is string => Boolean(src));
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

function listTripPhotos(slug: string): { path: string; image: ImageMetadata }[] {
  const prefix = getTripPhotoPrefix(slug);

  return Object.entries(tripImages)
    .filter(([path]) => path.startsWith(prefix))
    .sort(([pathA], [pathB]) => compareTripPhotoPaths(pathA, pathB))
    .map(([path, module]) => ({ path, image: module.default }));
}

export function getAllTripPhotoMetadata(slug: string): ImageMetadata[] {
  return listTripPhotos(slug).map((entry) => entry.image);
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

export function buildGalleryArchive(entries: ItineraryEntry[]): GalleryArchive {
  const photos: GalleryPhoto[] = [];
  const citiesByKey = new Map<string, GalleryCity>();

  const ordered = [...entries].sort((a, b) =>
    b.data.released_itinerary.start_date.localeCompare(
      a.data.released_itinerary.start_date,
    ),
  );

  for (const entry of ordered) {
    const { data } = entry;
    const slug = data.slug;
    const days = data.days.map((day) => ({
      day: day.day_number,
      city: day.main_city,
      region: regionForCity(data.cities, day.main_city),
      date: getDayDate(data.released_itinerary.start_date, day.day_number),
    }));

    for (const { path, image } of listTripPhotos(slug)) {
      const dateKey = photoDateKey(path);
      const match = dateKey ? days.find((day) => day.date === dateKey) : undefined;
      const href = match ? `/trips/${slug}#day-${match.day}` : `/trips/${slug}`;
      const place = match?.city ?? data.title;
      const index = photos.length + 1;
      const cityKey = match?.city ? normalizeCityName(match.city) : null;

      photos.push({
        url: image.src,
        srcset: `${image.src} ${image.width}w`,
        alt: `${place} — ${data.title}, photo ${index}`,
        photographer: 'Nico',
        tripSlug: slug,
        tripTitle: data.title,
        city: match?.city ?? null,
        cityKey,
        region: match?.region ?? null,
        day: match?.day ?? null,
        href,
      });

      if (!match?.city || !match.region || !cityKey) continue;
      if (citiesByKey.has(cityKey)) continue;

      const firstInCity = days.find((day) => normalizeCityName(day.city) === cityKey);
      const pinDay = firstInCity?.day ?? match.day;
      citiesByKey.set(cityKey, {
        name: match.city,
        key: cityKey,
        region: match.region,
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
  const prefix = getTripPhotoPrefix(slug);

  return Object.entries(tripImages)
    .filter(([path]) => path.startsWith(prefix) && path.includes(dayDate))
    .map(([, module]) => ({
      src: module.default.src,
      format: formatFromMetadata(module.default),
    }))
    .sort((a, b) => a.src.localeCompare(b.src));
}

function getAttractionPictures(
  slug: string,
  attractions: ItineraryEntry['data']['days'][number]['attractions'],
): TripGalleryPhoto[] {
  return attractions.flatMap((attraction) =>
    attraction.pictures
      .map((picture) => {
        const filename = picture.url.split('/').pop() ?? '';
        const image = resolveTripPhoto(slug, filename);
        if (!image) return undefined;
        return {
          src: image.src,
          format: picture.format,
        } satisfies TripGalleryPhoto;
      })
      .filter((photo): photo is TripGalleryPhoto => Boolean(photo)),
  );
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
): string {
  return `${trip.outgoing_city} → ${trip.destination_city} (${trip.departure_time} – ${trip.arrival_time})`;
}

function buildTripDescription(entry: ItineraryEntry, cities: string[]): string {
  const cityList = cities.join(', ');
  return `A ${entry.data.suggested_duration_days}-day journey across ${cityList}.`;
}

export function buildTripPage(entry: ItineraryEntry): TripPageData {
  const { data } = entry;
  const slug = data.slug;
  const orderedCities = getOrderedCities(entry);
  const destination = data.cities[0]?.country ?? 'China';

  return {
    title: data.title,
    dates: formatDateRange(
      data.released_itinerary.start_date,
      data.released_itinerary.end_date,
    ),
    destination,
    cities: orderedCities.join(', '),
    description: buildTripDescription(entry, orderedCities),
    route: buildTripRoute(entry),
    days: data.days.map((day) => {
      const dayDate = getDayDate(data.released_itinerary.start_date, day.day_number);
      const dayPictures = day.pictures
        .map((picture) => {
          const filename = picture.url.split('/').pop() ?? '';
          const image = resolveTripPhoto(slug, filename);
          if (!image) return undefined;
          return {
            src: image.src,
            format: picture.format,
          } satisfies TripGalleryPhoto;
        })
        .filter((photo): photo is TripGalleryPhoto => Boolean(photo));
      const assetGallery = getDayGallery(slug, dayDate);
      const attractionGallery = getAttractionPictures(slug, day.attractions);

      return {
        day: day.day_number,
        title: day.title,
        description: day.notes,
        activities: [
          ...day.attractions.map((attraction) => attraction.name),
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
    }),
  };
}

export function isPublishedItinerary(entry: ItineraryEntry): boolean {
  return !entry.id.startsWith('example');
}

function getTripType(entry: ItineraryEntry): 'report' | 'plan' {
  const endDate = new Date(`${entry.data.released_itinerary.end_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today ? 'report' : 'plan';
}

export function buildTripArchiveEntry(entry: ItineraryEntry): TripArchiveEntry {
  const { data } = entry;
  const orderedCities = getOrderedCities(entry);

  return {
    id: data.slug,
    title: data.title,
    regions: [...new Set(data.cities.map(city => city.region))],
    dates: formatDateRange(
      data.released_itinerary.start_date,
      data.released_itinerary.end_date,
    ),
    description: buildTripDescription(entry, orderedCities),
    type: getTripType(entry),
    photos: getTripPhotos(data.slug, data.released_itinerary.pictures),
    link: `/trips/${data.slug}`,
  };
}
