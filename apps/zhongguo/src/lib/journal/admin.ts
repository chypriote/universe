import { editDayRows } from './day-edit';
import { buildCoverPhotos } from './cover-photos';
import { TRIP_TABLES } from './tables';
import { fileNameDate, isDate, readPhotoFile } from './photo-file';
import {
	checkFileName,
	cityExists,
	findPhotoByName,
	ID_CHUNK,
	insertPhoto,
	putPhotoFiles,
	removePhotos,
	replacePhotoFile,
	titleValue,
	updatePhotos
} from './photo-store';
import type {
	PhotoTime,
	AddDayInput,
	AddDayResult,
	AdminPhoto,
	AdminDay,
	AdminTrip,
	AdminTripDetail,
	CoverRef,
	DeletePhotosInput,
	DeletePhotosResult,
	EditDayInput,
	EditDayResult,
	EditPhotosInput,
	EditPhotosResult,
	Journal,
	KeptPhoto,
	SetDayPhotosResult,
	SetDayVisibleResult,
	SetHighlightPhotosResult,
	SetTripCoverFocusResult,
	SetTripCoverResult,
	SetTripVisibleResult,
	PhotoChoice,
	Orientation,
	UploadPhotoInput,
	UploadPhotoResult
} from './types';

export type AdminEnv = { DB: D1Database; PHOTOS: R2Bucket };

export type PhotoUrls = {
	photoUrl(slug: string, name: string, version: number): string;
	thumbUrl(slug: string, name: string, version: number): string;
};

type AdminMethods = Pick<
	Journal,
	| 'listAdminTrips'
	| 'getAdminTrip'
	| 'setTripVisible'
	| 'setTripCover'
	| 'setTripCoverFocus'
	| 'setHighlightPhotos'
	| 'setDayVisible'
	| 'editDay'
	| 'addDay'
	| 'setDayPhotos'
	| 'listAdminPhotos'
	| 'uploadPhoto'
	| 'editPhotos'
	| 'deletePhotos'
>;

type PhotoRow = {
	id: number;
	name: string;
	slug: string;
	trip_id: number;
	width: number;
	height: number;
	date: string;
	time: PhotoTime | null;
	title: string | null;
	version: number;
	day_id: number | null;
	city_id: number | null;
	city: string | null;
	city_province: string | null;
	on_the_way_province: string | null;
};

const PHOTO_TIMES: PhotoTime[] = ['morning', 'afternoon', 'evening'];

type ChoiceRow = {
	id: number;
	name: string;
	slug: string;
	width: number;
	height: number;
	version: number;
};

type CoverRow = {
	photo_id: number;
	slug: string;
	title: string;
	position?: number;
	province?: string;
};

/** Whether a Photo of this size can be the cover: landscape for a Trip Cover, portrait for a Highlight Photo. */
export function fits(kind: CoverRef['kind'], size: { width: number; height: number }): boolean {
	if (kind === 'trip-cover') return orientationOf(size) === 'landscape';
	if (kind === 'highlight') return orientationOf(size) === 'portrait';
	return true;
}

function toCoverRef({ key, kind, label, href }: CoverRef): CoverRef {
	return { key, kind, label, href };
}

export function orientationOf(photo: { width: number; height: number }): Orientation {
	if (photo.width > photo.height) return 'landscape';
	if (photo.width < photo.height) return 'portrait';
	return 'square';
}

/** The Journal functions that write Photos and Cities, and the admin lists they need. */
export function buildAdmin(env: AdminEnv, urls: PhotoUrls): AdminMethods {
	const coverPhotos = buildCoverPhotos(env, TRIP_TABLES, 'unknown-trip');
	async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
		const { results } = await env.DB.prepare(sql)
			.bind(...params)
			.all<T>();
		return results;
	}

	/** Runs a query for ids in chunks: D1 allows 100 bound parameters per statement. */
	async function inChunks<T>(
		ids: number[],
		query: (marks: string, chunk: number[]) => Promise<T[]>
	): Promise<T[]> {
		const rows: T[] = [];
		for (let start = 0; start < ids.length; start += ID_CHUNK) {
			const chunk = ids.slice(start, start + ID_CHUNK);
			rows.push(...(await query(chunk.map(() => '?').join(','), chunk)));
		}
		return rows;
	}

	/** The Photos of a Trip, with the number of the visible Day of each date. */
	async function loadPhotos(tripId: number, photoId?: number): Promise<AdminPhoto[]> {
		const days = await all<{ id: number }>(
			'SELECT id FROM days WHERE trip_id = ? AND visible = 1 ORDER BY position',
			tripId
		);
		const rows = await all<PhotoRow>(
			`SELECT photos.id, photos.name, trips.slug, photos.trip_id, photos.width, photos.height, photos.date,
              photos.time, photos.title, photos.version, day_photos.day_id, cities.id AS city_id, cities.name AS city,
              city_provinces.name AS city_province, own_provinces.name AS on_the_way_province
       FROM photos
       JOIN trips ON trips.id = photos.trip_id
       LEFT JOIN day_photos ON day_photos.photo_id = photos.id
       LEFT JOIN cities ON cities.id = photos.city_id
       LEFT JOIN provinces AS city_provinces ON city_provinces.id = cities.province_id
       LEFT JOIN provinces AS own_provinces ON own_provinces.id = photos.province_id
       WHERE photos.trip_id = ? ${photoId === undefined ? '' : 'AND photos.id = ?'}
       ORDER BY photos.date, CASE photos.time WHEN 'morning' THEN 1 WHEN 'afternoon' THEN 2 WHEN 'evening' THEN 3 ELSE 4 END, photos.name`,
			tripId,
			...(photoId === undefined ? [] : [photoId])
		);
		return rows.map((row) => {
			const day = days.findIndex((candidate) => candidate.id === row.day_id);
			return {
				id: row.id,
				name: row.name,
				url: urls.photoUrl(row.slug, row.name, row.version),
				thumb: urls.thumbUrl(row.slug, row.name, row.version),
				orientation: orientationOf(row),
				date: row.date,
				time: row.time,
				day: day === -1 ? null : day + 1,
				title: row.title,
				city: row.city_id === null ? null : { id: row.city_id, name: row.city ?? '' },
				province: row.city_province ?? row.on_the_way_province,
				onTheWay: row.city_id === null
			};
		});
	}

	async function listAdminTrips(): Promise<AdminTrip[]> {
		const rows = await all<{ slug: string; title: string; visible: number; photos: number }>(
			`SELECT slug, title, visible,
         (SELECT COUNT(*) FROM photos WHERE photos.trip_id = trips.id) AS photos
       FROM trips ORDER BY start_date IS NULL, start_date DESC, slug`
		);
		return rows.map((row) => ({
			slug: row.slug,
			title: row.title,
			visible: row.visible === 1,
			photos: row.photos
		}));
	}

	async function tripBySlug(slug: string) {
		return env.DB.prepare(
			'SELECT id, slug, title, visible, cover_photo_id, cover_focus_x, cover_focus_y FROM trips WHERE slug = ?'
		)
			.bind(slug)
			.first<{
				id: number;
				slug: string;
				title: string;
				visible: number;
				cover_photo_id: number | null;
				cover_focus_x: number;
				cover_focus_y: number;
			}>();
	}

	async function getAdminTrip(slug: string): Promise<AdminTripDetail | null> {
		const trip = await tripBySlug(slug);
		if (!trip) return null;
		const rows = await all<{
			id: number;
			date: string;
			visible: number;
			title: string;
			notes: string;
			city_id: number;
			city: string;
			province: string;
		}>(
			`SELECT days.id, days.date, days.visible, days.title, days.notes, cities.id AS city_id, cities.name AS city,
              provinces.name AS province
       FROM days JOIN cities ON cities.id = days.city_id JOIN provinces ON provinces.id = cities.province_id
       WHERE days.trip_id = ? ORDER BY days.position`,
			trip.id
		);
		const earlier = await all<{ day_id: number; id: number; name: string }>(
			`SELECT day_cities.day_id, cities.id, cities.name FROM day_cities
       JOIN days ON days.id = day_cities.day_id JOIN cities ON cities.id = day_cities.city_id
       WHERE days.trip_id = ? ORDER BY day_cities.day_id, day_cities.position`,
			trip.id
		);
		const onDays = await all<{ day_id: number; photo_id: number }>(
			`SELECT day_photos.day_id, day_photos.photo_id FROM day_photos JOIN days ON days.id = day_photos.day_id
       WHERE days.trip_id = ? ORDER BY day_photos.day_id, day_photos.position`,
			trip.id
		);
		const activities = await all<{ day_id: number; activity_id: number }>(
			`SELECT day_activities.day_id, day_activities.activity_id FROM day_activities JOIN days ON days.id = day_activities.day_id
       WHERE days.trip_id = ? ORDER BY day_activities.day_id, day_activities.position`,
			trip.id
		);
		const highlights = await all<{ photo_id: number }>(
			'SELECT photo_id FROM highlight_photos WHERE trip_id = ? ORDER BY position',
			trip.id
		);
		let number = 0;
		const days: AdminDay[] = rows.map((row) => ({
			id: row.id,
			date: row.date,
			number: row.visible === 1 ? ++number : null,
			visible: row.visible === 1,
			title: row.title,
			notes: row.notes,
			city: { id: row.city_id, name: row.city },
			route: earlier
				.filter((entry) => entry.day_id === row.id)
				.map((entry) => ({ id: entry.id, name: entry.name })),
			province: row.province,
			photoIds: onDays.filter((entry) => entry.day_id === row.id).map((entry) => entry.photo_id),
			activityIds: activities
				.filter((entry) => entry.day_id === row.id)
				.map((entry) => entry.activity_id)
		}));
		return {
			slug: trip.slug,
			title: trip.title,
			visible: trip.visible === 1,
			days,
			photos: await loadPhotos(trip.id),
			coverId: trip.cover_photo_id,
			coverFocus: { x: trip.cover_focus_x, y: trip.cover_focus_y },
			highlightIds: highlights.map((row) => row.photo_id)
		};
	}

	async function setTripVisible(slug: string, visible: boolean): Promise<SetTripVisibleResult> {
		const trip = await tripBySlug(slug);
		if (!trip) return { ok: false, error: 'unknown-trip' };
		await env.DB.prepare('UPDATE trips SET visible = ? WHERE id = ?')
			.bind(visible ? 1 : 0, trip.id)
			.run();
		return { ok: true };
	}

	async function setDayVisible(dayId: number, visible: boolean): Promise<SetDayVisibleResult> {
		const day = await env.DB.prepare('SELECT id FROM days WHERE id = ?').bind(dayId).first();
		if (!day) return { ok: false, error: 'unknown-day' };
		await env.DB.prepare('UPDATE days SET visible = ? WHERE id = ?')
			.bind(visible ? 1 : 0, dayId)
			.run();
		return { ok: true };
	}

	async function editDay(input: EditDayInput): Promise<EditDayResult> {
		return editDayRows(env, TRIP_TABLES, input);
	}

	async function addDay(tripSlug: string, input: AddDayInput): Promise<AddDayResult> {
		const trip = await tripBySlug(tripSlug);
		if (!trip) return { ok: false, error: 'unknown-trip' };
		const title = input.title?.trim();
		if (!title) return { ok: false, error: 'invalid-title' };
		if (!isDate(input.date)) return { ok: false, error: 'invalid-date' };
		if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) {
			return { ok: false, error: 'unknown-city' };
		}
		const days = await all<{ id: number; date: string }>(
			'SELECT id, date FROM days WHERE trip_id = ? ORDER BY date',
			trip.id
		);
		if (days.some((day) => day.date === input.date)) return { ok: false, error: 'date-taken' };

		// Positions are unique per Trip: park the old ones below zero, insert at 0, then number every Day by date.
		// One batch, so a lost race on the date leaves nothing half done.
		try {
			await env.DB.batch([
				env.DB.prepare('UPDATE days SET position = -position WHERE trip_id = ?').bind(trip.id),
				env.DB.prepare(
					'INSERT INTO days (trip_id, position, date, city_id, title, notes) VALUES (?, 0, ?, ?, ?, ?)'
				).bind(trip.id, input.date, input.cityId, title, input.notes ?? ''),
				env.DB.prepare(
					`UPDATE days SET position = (SELECT COUNT(*) FROM days AS earlier WHERE earlier.trip_id = days.trip_id AND earlier.date <= days.date)
           WHERE trip_id = ?`
				).bind(trip.id),
				env.DB.prepare(
					`UPDATE trips SET start_date = (SELECT MIN(date) FROM days WHERE trip_id = trips.id),
                            end_date = (SELECT MAX(date) FROM days WHERE trip_id = trips.id)
           WHERE id = ?`
				).bind(trip.id),
				env.DB.prepare(
					`INSERT INTO day_photos (day_id, position, photo_id)
           SELECT (SELECT id FROM days WHERE trip_id = ?1 AND date = ?2), ROW_NUMBER() OVER (ORDER BY name), id FROM photos
           WHERE trip_id = ?1 AND date = ?2 AND id NOT IN (SELECT photo_id FROM day_photos)`
				).bind(trip.id, input.date)
			]);
		} catch {
			return { ok: false, error: 'date-taken' };
		}
		const added = await env.DB.prepare('SELECT id FROM days WHERE trip_id = ? AND date = ?')
			.bind(trip.id, input.date)
			.first<{ id: number }>();
		return { ok: true, dayId: added!.id };
	}

	async function listAdminPhotos(slug: string): Promise<AdminPhoto[] | null> {
		const trip = await env.DB.prepare('SELECT id FROM trips WHERE slug = ?')
			.bind(slug)
			.first<{ id: number }>();
		return trip ? loadPhotos(trip.id) : null;
	}

	/** What each of the given Photos is a cover of. */
	async function coversOf(
		photoIds: number[]
	): Promise<
		Map<number, (CoverRef & { tripSlug?: string; province?: string; position?: number })[]>
	> {
		const covers = new Map<
			number,
			(CoverRef & { tripSlug?: string; province?: string; position?: number })[]
		>();
		if (photoIds.length === 0) return covers;
		const add = (
			photoId: number,
			cover: CoverRef & { tripSlug?: string; province?: string; position?: number }
		) => covers.set(photoId, [...(covers.get(photoId) ?? []), cover]);

		for (const row of await inChunks(photoIds, (marks, chunk) =>
			all<CoverRow>(
				`SELECT cover_photo_id AS photo_id, slug, title FROM trips WHERE cover_photo_id IN (${marks})`,
				...chunk
			)
		)) {
			add(row.photo_id, {
				key: `trip-cover:${row.slug}`,
				kind: 'trip-cover',
				label: `Trip Cover of ${row.title}`,
				href: `/admin/trips/${row.slug}`,
				tripSlug: row.slug
			});
		}
		for (const row of await inChunks(photoIds, (marks, chunk) =>
			all<CoverRow>(
				`SELECT highlight_photos.photo_id, trips.slug, trips.title, highlight_photos.position
         FROM highlight_photos JOIN trips ON trips.id = highlight_photos.trip_id
         WHERE highlight_photos.photo_id IN (${marks}) ORDER BY trips.slug, highlight_photos.position`,
				...chunk
			)
		)) {
			add(row.photo_id, {
				key: `highlight:${row.slug}:${row.position}`,
				kind: 'highlight',
				label: `Highlight Photo ${row.position} of ${row.title}`,
				href: `/admin/trips/${row.slug}`,
				tripSlug: row.slug,
				position: row.position
			});
		}
		for (const row of await inChunks(photoIds, (marks, chunk) =>
			all<CoverRow>(
				`SELECT province_covers.photo_id, provinces.name AS province
         FROM province_covers JOIN provinces ON provinces.id = province_covers.province_id
         WHERE province_covers.photo_id IN (${marks}) ORDER BY provinces.name`,
				...chunk
			)
		)) {
			add(row.photo_id, {
				key: `province-cover:${row.province}`,
				kind: 'province-cover',
				label: `Province Cover of ${row.province}`,
				href: `/admin/atlas?province=${encodeURIComponent(row.province ?? '')}`,
				province: row.province
			});
		}
		return covers;
	}

	/** Puts a Photo at the end of the Day of a date; none when the Trip has no Day that date. */
	function placeOnDayOfDate(photoId: number, tripId: number, date: string) {
		return env.DB.prepare(
			`INSERT INTO day_photos (day_id, position, photo_id)
       SELECT days.id, COALESCE((SELECT MAX(position) FROM day_photos WHERE day_id = days.id), 0) + 1, ?
       FROM days WHERE trip_id = ? AND date = ?`
		)
			.bind(photoId, tripId, date)
			.run();
	}

	async function uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult> {
		const { name } = input;
		const checked = checkFileName(name);
		if ('error' in checked) return { ok: false, error: checked.error };

		const trip = await env.DB.prepare('SELECT id, slug FROM trips WHERE slug = ?')
			.bind(input.trip)
			.first<{ id: number; slug: string }>();
		if (!trip) return { ok: false, error: 'unknown-trip' };

		if (input.cityId !== undefined && !(await cityExists(env, input.cityId))) {
			return { ok: false, error: 'unknown-city' };
		}

		const existing = await findPhotoByName(env, TRIP_TABLES, trip.id, name);
		if (existing && !input.overwrite) return { ok: false, error: 'exists' };

		if (input.date !== undefined && !isDate(input.date))
			return { ok: false, error: 'invalid-date' };
		const file = readPhotoFile(input.file);
		if (!file) return { ok: false, error: 'unreadable' };
		const date = file.exifDate ?? fileNameDate(name) ?? input.date ?? null;
		if (!existing && !date) return { ok: false, error: 'no-date' };

		if (existing) {
			const broken =
				(await coversOf([existing.id]))
					.get(existing.id)
					?.filter((cover) => !fits(cover.kind, file)) ?? [];
			if (broken.length > 0)
				return { ok: false, error: 'breaks-cover', covers: broken.map(toCoverRef) };
		}

		await putPhotoFiles(env, trip.slug, name, checked.contentType, input.file, input.thumb);
		let photoId: number;
		if (existing) {
			photoId = existing.id;
			await replacePhotoFile(env, TRIP_TABLES, existing.id, file, {
				set: 'time = COALESCE(time, ?), ',
				params: [file.exifTime]
			});
		} else {
			photoId = await insertPhoto(env, TRIP_TABLES, trip.id, name, file, {
				date,
				time: file.exifTime,
				title: input.title ?? null,
				city_id: input.cityId ?? null
			});
			await placeOnDayOfDate(photoId, trip.id, date!);
		}

		const [photo] = await loadPhotos(trip.id, photoId);
		return { ok: true, photo, replaced: existing !== null };
	}

	async function editPhotos(input: EditPhotosInput): Promise<EditPhotosResult> {
		const ids = [...new Set(input.ids)];
		const known = await inChunks(ids, (marks, chunk) =>
			all<{ id: number }>(`SELECT id FROM photos WHERE id IN (${marks})`, ...chunk)
		);
		if (ids.length === 0 || known.length !== ids.length)
			return { ok: false, error: 'unknown-photo' };
		if (input.date !== undefined && !isDate(input.date))
			return { ok: false, error: 'invalid-date' };
		if (input.time !== undefined && input.time !== null && !PHOTO_TIMES.includes(input.time))
			return { ok: false, error: 'invalid-time' };

		const sets: string[] = [];
		const params: (string | number | null)[] = [];
		const { place } = input;
		if (place) {
			const cityId = 'cityId' in place ? place.cityId : null;
			const provinceId = 'onTheWay' in place ? (place.provinceId ?? null) : null;
			if (cityId !== null && !(await cityExists(env, cityId))) {
				return { ok: false, error: 'unknown-city' };
			}
			if (
				provinceId !== null &&
				!(await env.DB.prepare('SELECT id FROM provinces WHERE id = ?').bind(provinceId).first())
			) {
				return { ok: false, error: 'unknown-province' };
			}
			sets.push('city_id = ?', 'province_id = ?');
			params.push(cityId, provinceId);
		}
		if (input.date !== undefined) {
			sets.push('date = ?');
			params.push(input.date);
		}
		if (input.time !== undefined) {
			sets.push('time = ?');
			params.push(input.time);
		}
		if (input.title !== undefined) {
			sets.push('title = ?');
			params.push(titleValue(input.title));
		}
		if (input.date !== undefined) {
			const moving = await inChunks(ids, (marks, chunk) =>
				all<{ id: number; trip_id: number }>(
					`SELECT id, trip_id FROM photos WHERE date != ? AND id IN (${marks}) ORDER BY id`,
					input.date!,
					...chunk
				)
			);
			for (const photo of moving) {
				await env.DB.prepare('DELETE FROM day_photos WHERE photo_id = ?').bind(photo.id).run();
				await placeOnDayOfDate(photo.id, photo.trip_id, input.date);
			}
		}
		if (sets.length > 0) {
			await updatePhotos(env, TRIP_TABLES, ids, sets, params);
		}
		return { ok: true, updated: ids.length };
	}

	type Cover = CoverRef & { tripSlug?: string; province?: string; position?: number };

	/** The Photos that can take over a cover, none of the ones being deleted. */
	async function replacementsFor(
		cover: Cover,
		deleting: Set<number>
	): Promise<(PhotoChoice & { width: number; height: number })[]> {
		let rows: ChoiceRow[];
		if (cover.province !== undefined) {
			rows = await all<ChoiceRow>(
				`SELECT photos.id, photos.name, trips.slug, photos.width, photos.height, photos.version
         FROM photos JOIN trips ON trips.id = photos.trip_id
         JOIN cities ON cities.id = photos.city_id JOIN provinces ON provinces.id = cities.province_id
         WHERE provinces.name = ? ORDER BY photos.date, photos.name`,
				cover.province
			);
		} else {
			rows = await all<ChoiceRow>(
				`SELECT photos.id, photos.name, trips.slug, photos.width, photos.height, photos.version
         FROM photos JOIN trips ON trips.id = photos.trip_id
         WHERE trips.slug = ? ORDER BY photos.date, photos.name`,
				cover.tripSlug!
			);
		}
		const taken = new Set<number>();
		if (cover.kind === 'highlight') {
			for (const row of await all<{ photo_id: number }>(
				'SELECT photo_id FROM highlight_photos JOIN trips ON trips.id = highlight_photos.trip_id WHERE trips.slug = ?',
				cover.tripSlug!
			)) {
				taken.add(row.photo_id);
			}
		}
		return rows
			.filter((row) => !deleting.has(row.id) && !taken.has(row.id) && fits(cover.kind, row))
			.map((row) => ({
				id: row.id,
				name: row.name,
				thumb: urls.thumbUrl(row.slug, row.name, row.version),
				width: row.width,
				height: row.height
			}));
	}

	async function deletePhotos(input: DeletePhotosInput): Promise<DeletePhotosResult> {
		const requested = [...new Set(input.ids)];
		const photos = (
			await inChunks(requested, (marks, chunk) =>
				all<{ id: number; name: string; slug: string }>(
					`SELECT photos.id, photos.name, trips.slug FROM photos JOIN trips ON trips.id = photos.trip_id
           WHERE photos.id IN (${marks})`,
					...chunk
				)
			)
		).sort((a, b) => a.id - b.id);
		const deleting = new Set(photos.map((photo) => photo.id));
		const covers = await coversOf([...deleting]);

		const statements: D1PreparedStatement[] = [];
		const deleted: number[] = [];
		const kept: KeptPhoto[] = [];
		const used = new Set<string>();
		for (const photo of photos) {
			const own = covers.get(photo.id) ?? [];
			const options = await Promise.all(own.map((cover) => replacementsFor(cover, deleting)));
			const picked = own.map((cover, index) => {
				const id = input.replacements?.[cover.key];
				const taken = cover.kind === 'highlight' && used.has(`${cover.tripSlug}:${id}`);
				return id !== undefined && !taken && options[index].some((choice) => choice.id === id)
					? id
					: null;
			});

			if (picked.every((id) => id !== null)) {
				own.forEach((cover, index) => {
					const id = picked[index];
					if (cover.kind === 'highlight') used.add(`${cover.tripSlug}:${id}`);
					statements.push(
						cover.kind === 'trip-cover'
							? env.DB.prepare(
									'UPDATE trips SET cover_photo_id = ?, cover_focus_x = 50, cover_focus_y = 50 WHERE slug = ?'
								).bind(id, cover.tripSlug)
							: cover.kind === 'highlight'
								? env.DB.prepare(
										'UPDATE highlight_photos SET photo_id = ? WHERE position = ? AND trip_id = (SELECT id FROM trips WHERE slug = ?)'
									).bind(id, cover.position, cover.tripSlug)
								: env.DB.prepare(
										'UPDATE province_covers SET photo_id = ? WHERE province_id = (SELECT id FROM provinces WHERE name = ?)'
									).bind(id, cover.province)
					);
				});
				deleted.push(photo.id);
			} else {
				kept.push({
					id: photo.id,
					name: photo.name,
					covers: own.map((cover, index) => ({
						...toCoverRef(cover),
						replacements: options[index].map(({ id, name, thumb }) => ({ id, name, thumb }))
					}))
				});
			}
		}

		await removePhotos(
			env,
			TRIP_TABLES,
			photos.filter((photo) => deleted.includes(photo.id)),
			statements
		);
		return { deleted, kept };
	}

	return {
		editPhotos,
		deletePhotos,
		editDay,
		addDay,
		getAdminTrip,
		setDayPhotos: coverPhotos.setDayPhotos,
		setDayVisible,
		setHighlightPhotos: coverPhotos.setHighlightPhotos,
		setTripCover: coverPhotos.setCover,
		setTripCoverFocus: coverPhotos.setCoverFocus,
		setTripVisible,
		listAdminTrips,
		listAdminPhotos,
		uploadPhoto
	};
}
