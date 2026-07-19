import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';

type ItineraryEntry = CollectionEntry<'itineraries'>;

export type TripDay = {
  day: number;
  title: string;
  description: string;
  activities: string[];
  gallery: string[];
  food: string[];
};

export type TripPageData = {
  title: string;
  dates: string;
  destination: string;
  cities: string;
  description: string;
  days: TripDay[];
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

function getTripPhotoPrefix(slug: string): string {
  return `/src/assets/trips/${slug}/`;
}

function resolveTripPhoto(slug: string, filename: string): string | undefined {
  const path = `${getTripPhotoPrefix(slug)}${filename}`;
  return tripImages[path]?.default.src;
}

function getTripPhotos(slug: string, filenames: string[]): string[] {
  return filenames
    .map((filename) => resolveTripPhoto(slug, filename))
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

export function getAllTripPhotoMetadata(slug: string): ImageMetadata[] {
  const prefix = getTripPhotoPrefix(slug);

  return Object.entries(tripImages)
    .filter(([path]) => path.startsWith(prefix))
    .sort(([pathA], [pathB]) => {
      const takenA = parsePhotoTakenAt(pathA);
      const takenB = parsePhotoTakenAt(pathB);

      if (takenA !== null && takenB !== null && takenA !== takenB) {
        return takenA - takenB;
      }
      if (takenA !== null && takenB === null) return -1;
      if (takenA === null && takenB !== null) return 1;
      return pathA.localeCompare(pathB);
    })
    .map(([, module]) => module.default);
}

function getDayGallery(slug: string, dayDate: string): string[] {
  const prefix = getTripPhotoPrefix(slug);

  return Object.entries(tripImages)
    .filter(([path]) => path.startsWith(prefix) && path.includes(dayDate))
    .map(([, module]) => module.default.src)
    .sort();
}

function getAttractionPictures(
  attractions: ItineraryEntry['data']['days'][number]['attractions'],
): string[] {
  return attractions.flatMap((attraction) =>
    attraction.pictures.map((picture) => picture.url),
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
    days: data.days.map((day) => {
      const dayDate = getDayDate(data.released_itinerary.start_date, day.day_number);
      const assetGallery = getDayGallery(slug, dayDate);
      const attractionGallery = getAttractionPictures(day.attractions);

      return {
        day: day.day_number,
        title: day.title,
        description: day.notes,
        activities: [
          ...day.attractions.map((attraction) => attraction.name),
          ...day.train_trips.map(formatTrainTrip),
        ],
        gallery: assetGallery.length > 0 ? assetGallery : attractionGallery,
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
