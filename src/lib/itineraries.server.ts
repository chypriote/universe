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

function getDayGallery(slug: string, dayDate: string): string[] {
  const prefix = `/src/assets/trips/${slug}/`;

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
  const slug = entry.id;
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
