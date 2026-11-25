-- A Day with several Cities lists all of them in travel order, the last being where the Day ends, and flags the main one.
-- A Day with no rows has its main City alone (days.city_id, always a copy of the flagged row).
ALTER TABLE day_cities ADD COLUMN main INTEGER NOT NULL DEFAULT 0 CHECK (main IN (0, 1));

-- The rows of migration 0007 stop before the main City: add it after them.
INSERT INTO day_cities (day_id, position, city_id, main)
SELECT days.id, (SELECT MAX(position) FROM day_cities WHERE day_id = days.id) + 1, days.city_id, 1
FROM days
WHERE EXISTS (SELECT 1 FROM day_cities WHERE day_id = days.id);
