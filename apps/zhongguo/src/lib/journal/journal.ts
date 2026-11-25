import { issueToken, passwordMatches, tokenIsValid } from '@universe/owner/auth';
import { buildAdmin } from './admin';
import { formatDateRange } from '../plan-calendar';
import { getPlaceName } from '../place-names';
import type {
  Activity,
  ClearProvinceCoverResult,
  CoverCandidate,
  Gallery,
  GalleryCity,
  GalleryPhoto,
  FocalPoint,
  HomeProvince,
  Journal,
  LoginResult,
  Orientation,
  Photo,
  Route,
  RouteStop,
  SetProvinceCoverFocusResult,
  SetProvinceCoverResult,
  TripCard,
  TripDay,
  TripPage,
  TripType,
  VisitedProvince,
} from './types';

export type JournalEnv = {
  DB: D1Database;
  /** The photo bucket. */
  PHOTOS: R2Bucket;
  /** Public base URL of the photo bucket. */
  PHOTOS_URL: string;
  /** The Owner password, the same in every Universe app. */
  OWNER_PASSWORD: string;
  /** Key that signs the Owner login token, the same in every Universe app. */
  JWT_SECRET: string;
};

type TripRow = {
  id: number;
  slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  cover_photo_id: number | null;
  cover_focus_x: number;
  cover_focus_y: number;
};

type DayRow = {
  id: number;
  trip_id: number;
  date: string;
  title: string;
  notes: string;
  visible: number;
  city_id: number;
  city: string;
  city_zh: string;
  lng: number;
  lat: number;
  province: string;
};

type PhotoRow = {
  id: number;
  trip_id: number;
  name: string;
  width: number;
  height: number;
  date: string;
  title: string | null;
  version: number;
  /** The Day it is on, if any. */
  day_id: number | null;
  city_id: number | null;
  city: string | null;
  city_zh: string | null;
  city_lng: number | null;
  city_lat: number | null;
  city_major: number | null;
  city_province: string | null;
  on_the_way_province: string | null;
};

/** A City a Day is spent in. */
type DayStopRow = { id: number; name: string; nameZh: string; lng: number; lat: number; major: boolean; main: boolean };

/** The Cities of the Day in travel order, the last being where it ends; just its main City for a Day with one. */
type VisibleDay = DayRow & { number: number; stops: DayStopRow[] };

/** A visible Trip with what pages need from it, numbered and ready. */
type LoadedTrip = TripRow & {
  type: TripType;
  /** The visible Days, numbered from 1. */
  days: VisibleDay[];
  /** Ids of the Hidden Days: their Photos are not shown. */
  hiddenDayIds: Set<number>;
  photos: PhotoRow[];
};

const PHOTOGRAPHER = 'Nico';

export function buildJournal(env: JournalEnv): Journal {
  const photosUrl = (env.PHOTOS_URL ?? '').replace(/\/$/, '');
  if (!photosUrl) {
    throw new Error('PHOTOS_URL is not set. It is the public base URL of the photo bucket.');
  }

  const versioned = (version: number) => (version > 1 ? `?v=${version}` : '');
  const photoUrl = (slug: string, name: string, version = 1) =>
    `${photosUrl}/trips/${slug}/${encodeURIComponent(name)}${versioned(version)}`;
  const thumbUrl = (slug: string, name: string, version = 1) =>
    `${photosUrl}/thumbs/${slug}/${encodeURIComponent(name)}.webp${versioned(version)}`;

  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    const { results } = await env.DB.prepare(sql)
      .bind(...params)
      .all<T>();
    return results;
  }

  /** The visible Trips (one of them when a slug is given), newest first. */
  async function loadTrips(slug?: string): Promise<LoadedTrip[]> {
    const trips = await all<TripRow>(
      `SELECT id, slug, title, start_date, end_date, cover_photo_id, cover_focus_x, cover_focus_y FROM trips
       WHERE visible = 1 ${slug === undefined ? '' : 'AND slug = ?'}`,
      ...(slug === undefined ? [] : [slug]),
    );
    if (trips.length === 0) return [];

    const scope = slug === undefined ? '' : 'AND trips.slug = ?';
    const scopeParams = slug === undefined ? [] : [slug];
    const days = await all<DayRow>(
      `SELECT days.id, days.trip_id, days.date, days.title, days.notes, days.visible,
              cities.id AS city_id, cities.name AS city, cities.name_zh AS city_zh,
              cities.lng, cities.lat, provinces.name AS province
       FROM days
       JOIN trips ON trips.id = days.trip_id
       JOIN cities ON cities.id = days.city_id
       JOIN provinces ON provinces.id = cities.province_id
       WHERE trips.visible = 1 ${scope}
       ORDER BY days.trip_id, days.position`,
      ...scopeParams,
    );
    const earlier = await all<{
      day_id: number;
      id: number;
      name: string;
      name_zh: string;
      lng: number;
      lat: number;
      major: number;
      main: number;
    }>(
      `SELECT day_cities.day_id, cities.id, cities.name, cities.name_zh, cities.lng, cities.lat, cities.major, day_cities.main
       FROM day_cities
       JOIN days ON days.id = day_cities.day_id
       JOIN trips ON trips.id = days.trip_id
       JOIN cities ON cities.id = day_cities.city_id
       WHERE trips.visible = 1 ${scope}
       ORDER BY day_cities.day_id, day_cities.position`,
      ...scopeParams,
    );
    const majors = await majorCityIds();
    const photos = await all<PhotoRow>(
      `SELECT photos.id, photos.trip_id, photos.name, photos.width, photos.height, photos.date, photos.title, photos.version,
              day_photos.day_id, cities.id AS city_id, cities.name AS city, cities.name_zh AS city_zh,
              cities.lng AS city_lng, cities.lat AS city_lat, cities.major AS city_major,
              city_provinces.name AS city_province, own_provinces.name AS on_the_way_province
       FROM photos
       JOIN trips ON trips.id = photos.trip_id
       LEFT JOIN day_photos ON day_photos.photo_id = photos.id
       LEFT JOIN cities ON cities.id = photos.city_id
       LEFT JOIN provinces AS city_provinces ON city_provinces.id = cities.province_id
       LEFT JOIN provinces AS own_provinces ON own_provinces.id = photos.province_id
       WHERE trips.visible = 1 ${scope}
       ORDER BY photos.date, photos.name`,
      ...scopeParams,
    );

    const today = new Date().toISOString().slice(0, 10);
    return trips
      .map((trip): LoadedTrip => {
        const tripDays = days.filter((day) => day.trip_id === trip.id);
        return {
          ...trip,
          type: trip.end_date !== null && trip.end_date < today ? 'report' : 'plan',
          days: tripDays
            .filter((day) => day.visible === 1)
            .map((day, index) => ({
              ...day,
              number: index + 1,
              stops: (() => {
                const route = earlier.filter((row) => row.day_id === day.id);
                if (route.length === 0) {
                  return [{ id: day.city_id, name: day.city, nameZh: day.city_zh, lng: day.lng, lat: day.lat, major: majors.has(day.city_id), main: true }];
                }
                return route.map((row) => ({ id: row.id, name: row.name, nameZh: row.name_zh, lng: row.lng, lat: row.lat, major: row.major === 1, main: row.main === 1 }));
              })(),
            })),
          hiddenDayIds: new Set(tripDays.filter((day) => day.visible !== 1).map((day) => day.id)),
          photos: photos.filter((photo) => photo.trip_id === trip.id),
        };
      })
      .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? '') || a.slug.localeCompare(b.slug));
  }

  function orientation(photo: Pick<PhotoRow, 'width' | 'height'>): Orientation {
    if (photo.width > photo.height) return 'landscape';
    if (photo.width < photo.height) return 'portrait';
    return 'square';
  }

  function caption(photo: PhotoRow): string {
    if (photo.title) return photo.title;
    if (photo.city) return photo.city;
    return photo.on_the_way_province ? `On the way, ${photo.on_the_way_province}` : 'On the way';
  }

  function toPhoto(trip: LoadedTrip, photo: PhotoRow): Photo {
    const text = caption(photo);
    return {
      url: photoUrl(trip.slug, photo.name, photo.version),
      thumb: thumbUrl(trip.slug, photo.name, photo.version),
      orientation: orientation(photo),
      caption: text,
      alt: `${text} — ${trip.title}`,
    };
  }

  function dayOf(trip: LoadedTrip, photo: PhotoRow): VisibleDay | undefined {
    return trip.days.find((day) => day.id === photo.day_id);
  }

  function dayLabel(days: number[]): string {
    const parts: string[] = [];
    let start = days[0];
    let prev = days[0];
    for (let i = 1; i <= days.length; i++) {
      if (days[i] === prev + 1) {
        prev = days[i];
        continue;
      }
      parts.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = prev = days[i];
    }
    return parts.join(', ');
  }

  function buildRoute(trip: LoadedTrip): Route {
    const stops: RouteStop[] = [];
    let lastCityId: number | null = null;
    for (const day of trip.days) {
      for (const city of day.stops) {
        const last = stops.at(-1);
        if (last && lastCityId === city.id) {
          if (!last.days.includes(day.number)) last.days.push(day.number);
          last.dayLabel = dayLabel(last.days);
        } else {
          stops.push({ name: city.name, nameZh: city.nameZh, lng: city.lng, lat: city.lat, major: city.major, days: [day.number], dayLabel: String(day.number) });
        }
        lastCityId = city.id;
      }
    }

    const cities = new Map<string, RouteStop>();
    for (const stop of stops) {
      const known = cities.get(stop.name);
      if (!known) {
        cities.set(stop.name, { ...stop, days: [...stop.days] });
        continue;
      }
      known.days.push(...stop.days.filter((number) => !known.days.includes(number)));
      known.dayLabel = dayLabel(known.days);
    }
    return { stops, cities: [...cities.values()] };
  }

  function formatDates(trip: TripRow): string {
    if (!trip.start_date || !trip.end_date) return 'Dates to be decided';
    return formatDateRange(trip.start_date, trip.end_date);
  }

  /** The names of the Major Cities of the visible Days, in order of first visit. */
  function majorCityNames(trip: LoadedTrip, majorIds: Set<number>): string[] {
    const names: string[] = [];
    for (const day of trip.days) {
      for (const city of day.stops) {
        if (majorIds.has(city.id) && !names.includes(city.name)) names.push(city.name);
      }
    }
    return names;
  }

  async function majorCityIds(): Promise<Set<number>> {
    const rows = await all<{ id: number }>('SELECT id FROM cities WHERE major = 1');
    return new Set(rows.map((row) => row.id));
  }

  async function listTripCards(): Promise<TripCard[]> {
    const trips = await loadTrips();
    const majors = await majorCityIds();
    const highlights = await all<{ trip_id: number; position: number; photo_id: number }>(
      'SELECT trip_id, position, photo_id FROM highlight_photos ORDER BY trip_id, position',
    );

    return trips.map((trip) => {
      const thumb = (photoId: number | null) => {
        const photo = trip.photos.find((candidate) => candidate.id === photoId);
        return photo ? thumbUrl(trip.slug, photo.name, photo.version) : null;
      };
      const cities = majorCityNames(trip, majors);
      let description = 'Planned trip. Route and dates are not set yet.';
      if (trip.days.length > 0) {
        description =
          cities.length > 0 ? `A journey across ${cities.join(', ')}.` : `A ${trip.days.length}-day journey.`;
      }
      return {
        slug: trip.slug,
        title: trip.title,
        dates: formatDates(trip),
        description,
        type: trip.type,
        link: `/trips/${trip.slug}`,
        provinces: [...new Set(trip.days.map((day) => day.province))],
        route: buildRoute(trip),
        cover: thumb(trip.cover_photo_id),
        coverFocus: { x: trip.cover_focus_x, y: trip.cover_focus_y },
        highlights: highlights
          .filter((row) => row.trip_id === trip.id)
          .map((row) => thumb(row.photo_id))
          .filter((url): url is string => url !== null),
      };
    });
  }

  function placeActivity(name: string): Activity {
    const place = getPlaceName(name);
    return { name, nameZh: place.zh, pinyin: place.pinyin };
  }

  async function getTrip(slug: string): Promise<TripPage | null> {
    const [trip] = await loadTrips(slug);
    if (!trip) return null;

    const majors = await majorCityIds();
    const dayIds = trip.days.map((day) => day.id);
    const attractions = dayIds.length
      ? await all<{ day_id: number; name: string }>(
          `SELECT day_id, name FROM day_attractions WHERE day_id IN (${dayIds.map(() => '?').join(',')}) ORDER BY day_id, position`,
          ...dayIds,
        )
      : [];
    const rides = dayIds.length
      ? await all<{
          day_id: number;
          outgoing_city: string;
          destination_city: string;
          departure_time: string;
          arrival_time: string;
        }>(
          `SELECT day_id, outgoing_city, destination_city, departure_time, arrival_time FROM day_train_rides
           WHERE day_id IN (${dayIds.map(() => '?').join(',')}) ORDER BY day_id, position`,
          ...dayIds,
        )
      : [];
    const dayPhotos = dayIds.length
      ? await all<{ day_id: number; photo_id: number }>(
          `SELECT day_id, photo_id FROM day_photos WHERE day_id IN (${dayIds.map(() => '?').join(',')}) ORDER BY day_id, position`,
          ...dayIds,
        )
      : [];
    const restaurants = await all<{ city_id: number; suggested_dishes: string }>(
      'SELECT city_id, suggested_dishes FROM trip_restaurants WHERE trip_id = ? ORDER BY city_id, position',
      trip.id,
    );

    const days: TripDay[] = trip.days.map((day) => ({
      number: day.number,
      date: day.date,
      title: day.title,
      notes: day.notes,
      city: day.city,
      cities: day.stops.map((city) => ({ name: city.name, nameZh: city.nameZh, major: city.major, main: city.main })),
      activities: attractions.filter((row) => row.day_id === day.id).map((row) => placeActivity(row.name)),
      rides: rides
        .filter((row) => row.day_id === day.id)
        .map((ride) => `${ride.outgoing_city} → ${ride.destination_city} (${ride.departure_time} – ${ride.arrival_time})`),
      food: restaurants
        .filter((row) => day.stops.some((city) => city.id === row.city_id))
        .flatMap((row) => JSON.parse(row.suggested_dishes) as string[]),
      photos: dayPhotos
        .filter((row) => row.day_id === day.id)
        .map((row) => trip.photos.find((photo) => photo.id === row.photo_id))
        .filter((photo): photo is PhotoRow => photo !== undefined)
        .map((photo) => toPhoto(trip, photo)),
    }));

    const route = buildRoute(trip);
    const names = majorCityNames(trip, majors);
    let description = 'Planned trip. Route and dates are not set yet.';
    if (trip.days.length > 0) {
      description =
        names.length > 0
          ? `A ${trip.days.length}-day journey across ${names.join(', ')}.`
          : `A ${trip.days.length}-day journey.`;
    }

    return {
      slug: trip.slug,
      title: trip.title,
      dates: formatDates(trip),
      startDate: trip.start_date ?? '',
      destination: 'China',
      description,
      cities: route.cities.map((city) => ({ name: city.name, nameZh: city.nameZh })),
      days,
      planDays: trip.days.map((day) => ({ day: day.number, city: day.city })),
      route,
    };
  }

  /** The Photos of the Gallery, newest Trip first: none of a Hidden Day. */
  function galleryPhotos(trips: LoadedTrip[]) {
    return trips.flatMap((trip) =>
      trip.photos
        .filter((photo) => photo.day_id === null || !trip.hiddenDayIds.has(photo.day_id))
        .map((photo) => ({ trip, photo, day: dayOf(trip, photo) })),
    );
  }

  /** A Province counts as visited once a visible Day of a past Trip has its main City there. */
  function visitedProvinces(trips: LoadedTrip[]): string[] {
    return [
      ...new Set(trips.filter((trip) => trip.type === 'report').flatMap((trip) => trip.days.map((day) => day.province))),
    ].sort((a, b) => a.localeCompare(b));
  }

  async function getGallery(): Promise<Gallery> {
    const trips = await loadTrips();
    const items = galleryPhotos(trips);

    const photos: GalleryPhoto[] = items.map(({ trip, photo, day }) => ({
      ...toPhoto(trip, photo),
      tripSlug: trip.slug,
      tripTitle: trip.title,
      photographer: PHOTOGRAPHER,
      city: photo.city,
      province: photo.city_province,
      day: day?.number ?? null,
      href: day ? `/trips/${trip.slug}#day-${day.number}` : `/trips/${trip.slug}`,
    }));

    const pins = new Map<string, GalleryCity>();
    for (const { trip, photo } of items) {
      if (!photo.city || photo.city_major !== 1 || pins.has(photo.city)) continue;
      const stay = trip.days.find((day) => day.city_id === photo.city_id);
      pins.set(photo.city, {
        name: photo.city,
        nameZh: photo.city_zh ?? '',
        province: photo.city_province ?? '',
        lng: photo.city_lng ?? 0,
        lat: photo.city_lat ?? 0,
        tripTitle: trip.title,
        day: stay?.number ?? null,
        href: stay ? `/trips/${trip.slug}#day-${stay.number}` : `/trips/${trip.slug}`,
      });
    }

    return {
      photos,
      provinces: visitedProvinces(trips),
      cities: [...pins.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  type CoverItem = ReturnType<typeof galleryPhotos>[number];

  type ProvinceCover = { photoId: number; focus: FocalPoint };

  async function provinceCovers(): Promise<Map<string, ProvinceCover>> {
    const rows = await all<{ province: string; photo_id: number; focus_x: number; focus_y: number }>(
      `SELECT provinces.name AS province, province_covers.photo_id, province_covers.focus_x, province_covers.focus_y
       FROM province_covers JOIN provinces ON provinces.id = province_covers.province_id`,
    );
    return new Map(rows.map((row) => [row.province, { photoId: row.photo_id, focus: { x: row.focus_x, y: row.focus_y } }]));
  }

  /** The Photos that can cover a Province, in Gallery order: the first one is the fallback. */
  const candidatesOf = (items: CoverItem[], province: string) =>
    items.filter(({ photo }) => photo.city_province === province);

  async function getHomeMap(): Promise<HomeProvince[]> {
    const trips = await loadTrips();
    const covers = await provinceCovers();
    const zh = await all<{ name: string; name_zh: string }>('SELECT name, name_zh FROM provinces');
    const items = galleryPhotos(trips);
    const reports = trips.filter((trip) => trip.type === 'report');

    return visitedProvinces(trips).map((name) => {
      const tripsThere = reports.filter((trip) => trip.days.some((day) => day.province === name));
      const candidates = candidatesOf(items, name);
      const picked = candidates.find(({ photo }) => photo.id === covers.get(name)?.photoId);
      const shown = picked ?? candidates[0];
      return {
        name,
        nameZh: zh.find((province) => province.name === name)?.name_zh ?? '',
        photo: shown ? thumbUrl(shown.trip.slug, shown.photo.name, shown.photo.version) : null,
        ...(picked && { focus: covers.get(name)!.focus }),
        tripCount: tripsThere.length,
        href: `/trips/${tripsThere[0].slug}`,
      };
    });
  }

  async function listVisitedProvinces(): Promise<VisitedProvince[]> {
    const trips = await loadTrips();
    const covers = await provinceCovers();
    const zh = await all<{ name: string; name_zh: string }>('SELECT name, name_zh FROM provinces');
    const items = galleryPhotos(trips);

    return visitedProvinces(trips).map((name) => {
      const candidates = candidatesOf(items, name);
      const picked = candidates.find(({ photo }) => photo.id === covers.get(name)?.photoId);
      const shown = picked ?? candidates[0];
      return {
        name,
        nameZh: zh.find((province) => province.name === name)?.name_zh ?? '',
        photo: shown ? thumbUrl(shown.trip.slug, shown.photo.name, shown.photo.version) : null,
        coverId: picked?.photo.id ?? null,
        ...(picked && { focus: covers.get(name)!.focus }),
        fallback: !picked,
      };
    });
  }

  async function listCoverCandidates(province: string): Promise<CoverCandidate[] | null> {
    const trips = await loadTrips();
    if (!visitedProvinces(trips).includes(province)) return null;
    return candidatesOf(galleryPhotos(trips), province).map(({ trip, photo }) => ({
      id: photo.id,
      name: photo.name,
      thumb: thumbUrl(trip.slug, photo.name, photo.version),
      tripTitle: trip.title,
    }));
  }

  async function setProvinceCover(province: string, photoId: number): Promise<SetProvinceCoverResult> {
    const candidates = await listCoverCandidates(province);
    if (!candidates) return { ok: false, error: 'unknown-province' };
    if (!candidates.some((candidate) => candidate.id === photoId)) return { ok: false, error: 'unknown-photo' };
    await env.DB.prepare(
      `INSERT INTO province_covers (province_id, photo_id)
       SELECT id, ? FROM provinces WHERE name = ?
       ON CONFLICT (province_id) DO UPDATE SET photo_id = excluded.photo_id, focus_x = 50, focus_y = 50`,
    )
      .bind(photoId, province)
      .run();
    return { ok: true };
  }

  async function setProvinceCoverFocus(province: string, x: number, y: number): Promise<SetProvinceCoverFocusResult> {
    const inRange = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
    if (!inRange(x) || !inRange(y)) return { ok: false, error: 'invalid-focus' };
    const cover = (await listVisitedProvinces()).find((row) => row.name === province);
    if (!cover) return { ok: false, error: 'unknown-province' };
    if (cover.fallback) return { ok: false, error: 'no-cover' };
    await env.DB.prepare(
      'UPDATE province_covers SET focus_x = ?, focus_y = ? WHERE province_id = (SELECT id FROM provinces WHERE name = ?)',
    )
      .bind(Math.round(x), Math.round(y), province)
      .run();
    return { ok: true };
  }

  async function clearProvinceCover(province: string): Promise<ClearProvinceCoverResult> {
    if (!visitedProvinces(await loadTrips()).includes(province)) return { ok: false, error: 'unknown-province' };
    await env.DB.prepare('DELETE FROM province_covers WHERE province_id = (SELECT id FROM provinces WHERE name = ?)')
      .bind(province)
      .run();
    return { ok: true };
  }

  async function login(password: string): Promise<LoginResult> {
    if (
      !env.OWNER_PASSWORD ||
      !env.JWT_SECRET ||
      !password ||
      !(await passwordMatches(password, env.OWNER_PASSWORD))
    ) {
      return { ok: false, error: 'wrong-password' };
    }
    return { ok: true, token: await issueToken(env.JWT_SECRET) };
  }

  const verifyToken = async (token: string) => !!env.JWT_SECRET && (await tokenIsValid(token, env.JWT_SECRET));

  return {
    listTripCards,
    getTrip,
    getGallery,
    getHomeMap,
    listVisitedProvinces,
    listCoverCandidates,
    setProvinceCover,
    setProvinceCoverFocus,
    clearProvinceCover,
    login,
    verifyToken,
    ...buildAdmin(env, { photoUrl, thumbUrl }),
  };
}
