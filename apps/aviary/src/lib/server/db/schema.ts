import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Where a Bird came from. Kept on the Admin page. */
export const habitats = sqliteTable('habitat', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

/** A channel the Owner shares with a Bird. Kept on the Admin page. */
export const songs = sqliteTable('song', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const birds = sqliteTable(
	'bird',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		/** The Arrival: a day (`YYYY-MM-DD`), a month (`YYYY-MM`) or only a year (`YYYY`). Null when unknown. */
		arrival: text('arrival'),
		/** `day`, `month` or `year`. Null with a null Arrival. Lets a month or year Arrival sort with day Arrivals. */
		arrivalPrecision: text('arrival_precision', { enum: ['day', 'month', 'year'] }),
		habitatId: integer('habitat_id').references(() => habitats.id),
		notes: text('notes').notNull().default(''),
		seen: integer('seen', { mode: 'boolean' }).notNull().default(false),
		flown: integer('flown', { mode: 'boolean' }).notNull().default(false),
		lost: integer('lost', { mode: 'boolean' }).notNull().default(false),
		roosted: integer('roosted', { mode: 'boolean' }).notNull().default(false),
		nest: integer('nest', { mode: 'boolean' }).notNull().default(false),
		archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
	},
	(t) => [
		check('bird_arrival_precision', sql`(${t.arrival} IS NULL) = (${t.arrivalPrecision} IS NULL)`),
		index('bird_habitat_id').on(t.habitatId)
	]
);

export const pictures = sqliteTable(
	'picture',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		birdId: integer('bird_id')
			.notNull()
			.references(() => birds.id),
		/** Random key of the object in the private R2 bucket. */
		key: text('key').notNull().unique(),
		position: integer('position').notNull()
	},
	(t) => [index('picture_bird_id').on(t.birdId)]
);

export const sightings = sqliteTable(
	'sighting',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		birdId: integer('bird_id')
			.notNull()
			.references(() => birds.id),
		/** `YYYY-MM-DD`, or null when the day is unknown. */
		day: text('day')
	},
	(t) => [index('sighting_bird_id').on(t.birdId)]
);

export const birdSongs = sqliteTable(
	'bird_song',
	{
		birdId: integer('bird_id')
			.notNull()
			.references(() => birds.id),
		songId: integer('song_id')
			.notNull()
			.references(() => songs.id)
	},
	(t) => [primaryKey({ columns: [t.birdId, t.songId] }), index('bird_song_song_id').on(t.songId)]
);

/** Code name to display word. Filled from outside the repository: the migration leaves it empty. */
export const labels = sqliteTable('labels', {
	codeName: text('code_name').primaryKey(),
	word: text('word').notNull()
});
