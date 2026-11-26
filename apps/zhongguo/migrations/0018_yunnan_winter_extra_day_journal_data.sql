-- Yunnan Winter: the train to Kunming moves to 7 December. A new Shenzhen Day takes 6 December. Every later Day moves one day on.
-- Positions and dates are made unique before they move, because both columns are UNIQUE.
UPDATE days SET position = -position, date = 'old-' || date
WHERE trip_id = (SELECT id FROM trips WHERE slug = 'yunnan-winter') AND position >= 8;

UPDATE days SET position = 1 - position, date = date(substr(date, 5), '+1 day')
WHERE trip_id = (SELECT id FROM trips WHERE slug = 'yunnan-winter') AND position < 0;

-- Photos keep matching the date of the Day they sit on.
UPDATE photos SET date = date(date, '+1 day')
WHERE trip_id = (SELECT id FROM trips WHERE slug = 'yunnan-winter') AND date >= '2025-12-07';

INSERT INTO days (trip_id, position, date, city_id, title, notes, visible)
SELECT trips.id, 8, '2025-12-06', cities.id, 'Shenzhen',
    'I spent the day in Shenzhen, the large city on the border with Hong Kong. It grew from a small town into a major city of skyscrapers and parks in a few decades. It is also one of the main rail hubs of southern China.', 1
FROM trips, cities WHERE trips.slug = 'yunnan-winter' AND cities.name = 'Shenzhen';
