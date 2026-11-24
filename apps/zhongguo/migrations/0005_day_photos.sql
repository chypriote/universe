-- The ordered Photos of each Day. A Photo is on at most one Day; one on no Day stays in the Gallery under its Trip.
CREATE TABLE day_photos (
    day_id INTEGER NOT NULL REFERENCES days (id),
    position INTEGER NOT NULL,
    photo_id INTEGER NOT NULL UNIQUE REFERENCES photos (id),
    PRIMARY KEY (day_id, position)
);

-- Filled once from the date rule: each Photo goes on the Day of its date, in the order the pages showed them.
INSERT INTO day_photos (day_id, position, photo_id)
SELECT days.id,
       ROW_NUMBER() OVER (PARTITION BY days.id ORDER BY photos.name),
       photos.id
FROM photos
JOIN days ON days.trip_id = photos.trip_id AND days.date = photos.date;
