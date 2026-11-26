-- Trip plans live apart from Trips (ADR 0003). A plan has numbered Days and no dates. Its Photos are files under
-- trips/<slug>/ in the photo bucket, so a slug is unique across Trips and plans.
CREATE TABLE plans (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
    -- Whether `npm run china` searches the plan's Fare windows and the Plan page shows prices.
    search_flights INTEGER NOT NULL DEFAULT 1 CHECK (search_flights IN (0, 1)),
    cover_photo_id INTEGER,
    cover_focus_x INTEGER NOT NULL DEFAULT 50,
    cover_focus_y INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE plan_photos (
    id INTEGER PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans (id),
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    title TEXT,
    city_id INTEGER REFERENCES cities (id),
    province_id INTEGER REFERENCES provinces (id),
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (plan_id, name),
    CHECK (city_id IS NULL OR province_id IS NULL)
);

CREATE TABLE plan_highlight_photos (
    plan_id INTEGER NOT NULL REFERENCES plans (id),
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
    photo_id INTEGER NOT NULL REFERENCES plan_photos (id),
    PRIMARY KEY (plan_id, position)
);

CREATE TABLE plan_days (
    id INTEGER PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans (id),
    position INTEGER NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    title TEXT NOT NULL,
    notes TEXT NOT NULL,
    UNIQUE (plan_id, position)
);

-- Same rules as day_cities: a Day with no rows has its main City alone (plan_days.city_id).
CREATE TABLE plan_day_cities (
    day_id INTEGER NOT NULL REFERENCES plan_days (id),
    position INTEGER NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    main INTEGER NOT NULL DEFAULT 0 CHECK (main IN (0, 1)),
    PRIMARY KEY (day_id, position)
);

CREATE TABLE plan_day_photos (
    day_id INTEGER NOT NULL REFERENCES plan_days (id),
    position INTEGER NOT NULL,
    photo_id INTEGER NOT NULL UNIQUE REFERENCES plan_photos (id),
    PRIMARY KEY (day_id, position)
);

CREATE TABLE plan_day_attractions (
    day_id INTEGER NOT NULL REFERENCES plan_days (id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    rating REAL NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (day_id, position)
);

CREATE TABLE plan_day_train_rides (
    day_id INTEGER NOT NULL REFERENCES plan_days (id),
    position INTEGER NOT NULL,
    outgoing_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    PRIMARY KEY (day_id, position)
);

-- Xinjiang, Tibet and Jiangnan Autumn move from Trips to plans, keeping their ids. Hidden Days stay behind.
-- (Empty Trips table in tests: every statement below is then a no-op.)
INSERT INTO plans (id, slug, title, visible, search_flights, cover_photo_id, cover_focus_x, cover_focus_y)
SELECT id, slug, title, visible, on_plan, NULL, cover_focus_x, cover_focus_y FROM trips
WHERE slug IN ('xinjiang', 'tibet', 'jiangnan-autumn');

INSERT INTO plan_days (id, plan_id, position, city_id, title, notes)
SELECT id, trip_id, ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY position), city_id, title, notes FROM days
WHERE visible = 1 AND trip_id IN (SELECT id FROM plans);

INSERT INTO plan_day_cities (day_id, position, city_id, main)
SELECT day_id, position, city_id, main FROM day_cities WHERE day_id IN (SELECT id FROM plan_days);

INSERT INTO plan_day_attractions (day_id, position, name, city, rating, description)
SELECT day_id, position, name, city, rating, description FROM day_attractions WHERE day_id IN (SELECT id FROM plan_days);

INSERT INTO plan_day_train_rides (day_id, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes)
SELECT day_id, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes
FROM day_train_rides WHERE day_id IN (SELECT id FROM plan_days);

INSERT INTO plan_photos (id, plan_id, name, width, height, title, city_id, province_id, version)
SELECT id, trip_id, name, width, height, title, city_id, province_id, version FROM photos
WHERE trip_id IN (SELECT id FROM plans)
  AND id NOT IN (SELECT photo_id FROM day_photos WHERE day_id NOT IN (SELECT id FROM plan_days));

INSERT INTO plan_day_photos (day_id, position, photo_id)
SELECT day_id, position, photo_id FROM day_photos WHERE day_id IN (SELECT id FROM plan_days);

INSERT INTO plan_highlight_photos (plan_id, position, photo_id)
SELECT trip_id, position, photo_id FROM highlight_photos WHERE photo_id IN (SELECT id FROM plan_photos);

UPDATE plans SET cover_photo_id = (SELECT cover_photo_id FROM trips WHERE trips.id = plans.id)
WHERE (SELECT cover_photo_id FROM trips WHERE trips.id = plans.id) IN (SELECT id FROM plan_photos);

-- Remove them from the Trips side, children first.
UPDATE trips SET cover_photo_id = NULL WHERE id IN (SELECT id FROM plans);
DELETE FROM province_covers WHERE photo_id IN (SELECT id FROM photos WHERE trip_id IN (SELECT id FROM plans));
DELETE FROM highlight_photos WHERE trip_id IN (SELECT id FROM plans);
DELETE FROM day_photos WHERE day_id IN (SELECT id FROM days WHERE trip_id IN (SELECT id FROM plans));
DELETE FROM day_attractions WHERE day_id IN (SELECT id FROM days WHERE trip_id IN (SELECT id FROM plans));
DELETE FROM day_train_rides WHERE day_id IN (SELECT id FROM days WHERE trip_id IN (SELECT id FROM plans));
DELETE FROM day_cities WHERE day_id IN (SELECT id FROM days WHERE trip_id IN (SELECT id FROM plans));
DELETE FROM photos WHERE trip_id IN (SELECT id FROM plans);
DELETE FROM days WHERE trip_id IN (SELECT id FROM plans);
DELETE FROM trip_hotels WHERE trip_id IN (SELECT id FROM plans);
DELETE FROM trip_restaurants WHERE trip_id IN (SELECT id FROM plans);
DELETE FROM trips WHERE id IN (SELECT id FROM plans);

ALTER TABLE trips DROP COLUMN on_plan;
