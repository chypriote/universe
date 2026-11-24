CREATE TABLE provinces (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_zh TEXT NOT NULL
);

CREATE TABLE cities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_zh TEXT NOT NULL,
    province_id INTEGER NOT NULL REFERENCES provinces (id),
    lng REAL NOT NULL,
    lat REAL NOT NULL,
    major INTEGER NOT NULL DEFAULT 0 CHECK (major IN (0, 1))
);

CREATE TABLE trips (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    suggested_days INTEGER,
    visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
    cover_photo_id INTEGER REFERENCES photos (id)
);

CREATE TABLE photos (
    id INTEGER PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips (id),
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    date TEXT NOT NULL,
    title TEXT,
    city_id INTEGER REFERENCES cities (id),
    province_id INTEGER REFERENCES provinces (id),
    UNIQUE (trip_id, name),
    CHECK (city_id IS NULL OR province_id IS NULL)
);

CREATE TABLE highlight_photos (
    trip_id INTEGER NOT NULL REFERENCES trips (id),
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
    photo_id INTEGER NOT NULL REFERENCES photos (id),
    PRIMARY KEY (trip_id, position)
);

CREATE TABLE province_covers (
    province_id INTEGER PRIMARY KEY REFERENCES provinces (id),
    photo_id INTEGER NOT NULL REFERENCES photos (id)
);

CREATE TABLE days (
    id INTEGER PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips (id),
    position INTEGER NOT NULL,
    date TEXT NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    title TEXT NOT NULL,
    notes TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
    UNIQUE (trip_id, position),
    UNIQUE (trip_id, date)
);

CREATE TABLE day_attractions (
    day_id INTEGER NOT NULL REFERENCES days (id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    rating REAL NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (day_id, position)
);

CREATE TABLE day_train_rides (
    day_id INTEGER NOT NULL REFERENCES days (id),
    position INTEGER NOT NULL,
    outgoing_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    PRIMARY KEY (day_id, position)
);

CREATE TABLE trip_hotels (
    trip_id INTEGER NOT NULL REFERENCES trips (id),
    city_id INTEGER NOT NULL REFERENCES cities (id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    rating REAL NOT NULL,
    price REAL,
    PRIMARY KEY (trip_id, city_id, position)
);

CREATE TABLE trip_restaurants (
    trip_id INTEGER NOT NULL REFERENCES trips (id),
    city_id INTEGER NOT NULL REFERENCES cities (id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    rating REAL NOT NULL,
    suggested_dishes TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (trip_id, city_id, position)
);
