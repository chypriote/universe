-- SQLite schema for travel data (converted from trips.sql)

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  country TEXT,
  region TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS itineraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  suggested_duration_days INTEGER NOT NULL CHECK (suggested_duration_days > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  itinerary_id INTEGER NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  main_city_id INTEGER NOT NULL REFERENCES cities(id),
  title TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (itinerary_id, day_number)
);

CREATE TABLE IF NOT EXISTS attractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  price REAL CHECK (price >= 0),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS train_trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  outgoing_city_id INTEGER NOT NULL REFERENCES cities(id),
  destination_city_id INTEGER NOT NULL REFERENCES cities(id),
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  departure_time TEXT,
  arrival_time TEXT,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (outgoing_city_id <> destination_city_id)
);

CREATE TABLE IF NOT EXISTS released_itineraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  itinerary_id INTEGER NOT NULL UNIQUE REFERENCES itineraries(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS pictures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attraction_pictures (
  attraction_id INTEGER NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  picture_id INTEGER NOT NULL REFERENCES pictures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (attraction_id, picture_id)
);

CREATE TABLE IF NOT EXISTS hotel_pictures (
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  picture_id INTEGER NOT NULL REFERENCES pictures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, picture_id)
);

CREATE TABLE IF NOT EXISTS restaurant_pictures (
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  picture_id INTEGER NOT NULL REFERENCES pictures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, picture_id)
);

CREATE TABLE IF NOT EXISTS released_itinerary_pictures (
  released_itinerary_id INTEGER NOT NULL REFERENCES released_itineraries(id) ON DELETE CASCADE,
  picture_id INTEGER NOT NULL REFERENCES pictures(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (released_itinerary_id, picture_id)
);

CREATE TABLE IF NOT EXISTS restaurant_suggested_dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_days_itinerary_id ON days(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_days_main_city_id ON days(main_city_id);

CREATE INDEX IF NOT EXISTS idx_attractions_city_id ON attractions(city_id);
CREATE INDEX IF NOT EXISTS idx_hotels_city_id ON hotels(city_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city_id ON restaurants(city_id);

CREATE INDEX IF NOT EXISTS idx_train_trips_day_id ON train_trips(day_id);
CREATE INDEX IF NOT EXISTS idx_train_trips_outgoing_city_id ON train_trips(outgoing_city_id);
CREATE INDEX IF NOT EXISTS idx_train_trips_destination_city_id ON train_trips(destination_city_id);
CREATE INDEX IF NOT EXISTS idx_train_trips_time_of_day ON train_trips(time_of_day);

CREATE INDEX IF NOT EXISTS idx_released_itineraries_start_date ON released_itineraries(start_date);
CREATE INDEX IF NOT EXISTS idx_released_itineraries_end_date ON released_itineraries(end_date);

CREATE INDEX IF NOT EXISTS idx_attraction_pictures_picture_id ON attraction_pictures(picture_id);
CREATE INDEX IF NOT EXISTS idx_hotel_pictures_picture_id ON hotel_pictures(picture_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_pictures_picture_id ON restaurant_pictures(picture_id);
CREATE INDEX IF NOT EXISTS idx_released_itinerary_pictures_picture_id ON released_itinerary_pictures(picture_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_suggested_dishes_restaurant_id ON restaurant_suggested_dishes(restaurant_id);
