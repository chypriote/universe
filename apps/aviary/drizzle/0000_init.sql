CREATE TABLE `bird_song` (
	`bird_id` integer NOT NULL,
	`song_id` integer NOT NULL,
	PRIMARY KEY(`bird_id`, `song_id`),
	FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`song_id`) REFERENCES `song`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bird_song_song_id` ON `bird_song` (`song_id`);--> statement-breakpoint
CREATE TABLE `bird` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`arrival` text,
	`arrival_precision` text,
	`habitat_id` integer,
	`notes` text DEFAULT '' NOT NULL,
	`seen` integer DEFAULT false NOT NULL,
	`flown` integer DEFAULT false NOT NULL,
	`lost` integer DEFAULT false NOT NULL,
	`roosted` integer DEFAULT false NOT NULL,
	`nest` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`habitat_id`) REFERENCES `habitat`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bird_arrival_precision" CHECK(("bird"."arrival" IS NULL) = ("bird"."arrival_precision" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `bird_habitat_id` ON `bird` (`habitat_id`);--> statement-breakpoint
CREATE TABLE `habitat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habitat_name_unique` ON `habitat` (`name`);--> statement-breakpoint
CREATE TABLE `labels` (
	`code_name` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `picture` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bird_id` integer NOT NULL,
	`key` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `picture_key_unique` ON `picture` (`key`);--> statement-breakpoint
CREATE INDEX `picture_bird_id` ON `picture` (`bird_id`);--> statement-breakpoint
CREATE TABLE `sighting` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bird_id` integer NOT NULL,
	`day` text,
	FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sighting_bird_id` ON `sighting` (`bird_id`);--> statement-breakpoint
CREATE TABLE `song` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `song_name_unique` ON `song` (`name`);