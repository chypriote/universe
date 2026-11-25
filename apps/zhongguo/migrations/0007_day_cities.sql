-- The Cities a Day starts in or passes through before its main City, in order. Most Days have none.
CREATE TABLE day_cities (
    day_id INTEGER NOT NULL REFERENCES days (id),
    position INTEGER NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    PRIMARY KEY (day_id, position)
);
