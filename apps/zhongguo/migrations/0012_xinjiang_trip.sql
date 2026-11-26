-- The Xinjiang plan: 22 Days from Sat 11 Sep 2027. Adds the Cities that do not exist yet (matched by name).
WITH v (name, name_zh, lng, lat, major) AS (VALUES
  ('Urumqi', '乌鲁木齐', 87.6168, 43.8256, 1),
  ('Tianchi', '天池', 88.1311, 43.8863, 0),
  ('Urho Ghost City', '乌尔禾魔鬼城', 85.85, 46.05, 0),
  ('Karamay', '克拉玛依', 84.8892, 45.5795, 0),
  ('Burqin', '布尔津', 86.8566, 47.7007, 0),
  ('Kanas', '喀纳斯', 87.04, 48.815, 0),
  ('Hemu', '禾木', 87.42, 49.03, 0),
  ('Koktokay', '可可托海', 89.65, 47.217, 0),
  ('Sayram Lake', '赛里木湖', 81.2, 44.6, 0),
  ('Yining', '伊宁', 81.3243, 43.9168, 0),
  ('Kalajun Grassland', '喀拉峻草原', 81.9, 43.3, 0),
  ('Nalati', '那拉提', 84.0, 43.32, 0),
  ('Bayinbulak', '巴音布鲁克', 84.15, 42.85, 0),
  ('Kuqa', '库车', 82.9365, 41.7278, 0),
  ('Kizil Caves', '克孜尔千佛洞', 82.5047, 41.7844, 0),
  ('Kashgar', '喀什', 75.9892, 39.4677, 1),
  ('Baisha Lake', '白沙湖', 75.05, 38.62, 0),
  ('Karakul Lake', '喀拉库勒湖', 75.05, 38.43, 0),
  ('Tashkurgan', '塔什库尔干', 75.2299, 37.7721, 0),
  ('Khunjerab Pass', '红其拉甫', 75.4283, 36.85, 0),
  ('Turpan', '吐鲁番', 89.1895, 42.9512, 1))
INSERT INTO cities (name, name_zh, province_id, lng, lat, major)
SELECT v.name, v.name_zh, (SELECT id FROM provinces WHERE name = 'Xinjiang'), v.lng, v.lat, v.major
FROM v
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE cities.name = v.name);

UPDATE trips SET start_date = '2027-09-11', end_date = '2027-10-02', suggested_days = 22 WHERE slug = 'xinjiang';

WITH d (position, title, notes, main) AS (VALUES
  (1, 'Arrive in Urumqi', 'Rest and prepare.', 'Urumqi'),
  (2, 'Tianchi Heavenly Lake', 'Day trip from Urumqi, about 1.5 h each way.', 'Tianchi'),
  (3, 'Urho Ghost City and Karamay', 'Drive about 4 h.', 'Urho Ghost City'),
  (4, 'Karamay to Burqin', 'Drive about 4 h.', 'Burqin'),
  (5, 'Kanas Lake', 'Drive about 2.5 h from Burqin.', 'Kanas'),
  (6, 'Hemu village', 'Drive about 1 h from Kanas.', 'Hemu'),
  (7, 'Koktokay', 'Drive about 4.5 h from Hemu.', 'Koktokay'),
  (8, 'Fly Koktokay to Urumqi', 'Flight about 1 h. Check the flight days before booking.', 'Koktokay'),
  (9, 'Sayram Lake', 'Drive about 5.5 h from Urumqi.', 'Sayram Lake'),
  (10, 'Ili Valley and Yining', 'Drive about 2 h from Sayram Lake, over Guozigou.', 'Yining'),
  (11, 'Kalajun and Nalati', 'Drive about 4 h, with a stop at Kalajun Grassland.', 'Nalati'),
  (12, 'Bayinbulak grassland', 'Drive about 3 h.', 'Bayinbulak'),
  (13, 'Duku Highway to Kuqa', 'Drive about 6 h. Check that the Duku Highway is open.', 'Kuqa'),
  (14, 'Kizil Caves and Kuqa old town', 'Buffer day.', 'Kizil Caves'),
  (15, 'Fly Kuqa to Kashgar', 'Afternoon flight, about 1.3 h.', 'Kashgar'),
  (16, 'Kashgar old city', 'Old city, Id Kah Mosque and the permit office.', 'Kashgar'),
  (17, 'Karakoram Highway to Tashkurgan', 'Drive about 6 h, with stops at Baisha Lake and Karakul Lake.', 'Karakul Lake'),
  (18, 'Khunjerab Pass', 'Pamirs and the Karakoram Highway, about 3 h. Needs a permit.', 'Khunjerab Pass'),
  (19, 'Tashkurgan to Kashgar', 'Drive about 4 h.', 'Kashgar'),
  (20, 'Fly to Urumqi, train to Turpan', 'Flight about 2 h, then train about 1.5 h.', 'Turpan'),
  (21, 'Turpan', 'Jiaohe Ruins, Flaming Mountains and Karez Wells.', 'Turpan'),
  (22, 'Back to Urumqi', 'Morning in Turpan, train about 1.5 h, then fly out.', 'Turpan'))
INSERT INTO days (trip_id, position, date, city_id, title, notes)
SELECT trips.id, d.position, date('2027-09-11', '+' || (d.position - 1) || ' days'), cities.id, d.title, d.notes
FROM d
JOIN trips ON trips.slug = 'xinjiang'
JOIN cities ON cities.name = d.main;

-- Days with one City have no day_cities rows.
WITH r (day, position, city, main) AS (VALUES
  (2, 1, 'Urumqi', 0),
  (2, 2, 'Tianchi', 1),
  (2, 3, 'Urumqi', 0),
  (3, 1, 'Urumqi', 0),
  (3, 2, 'Urho Ghost City', 1),
  (3, 3, 'Karamay', 0),
  (4, 1, 'Karamay', 0),
  (4, 2, 'Burqin', 1),
  (5, 1, 'Burqin', 0),
  (5, 2, 'Kanas', 1),
  (6, 1, 'Kanas', 0),
  (6, 2, 'Hemu', 1),
  (7, 1, 'Hemu', 0),
  (7, 2, 'Koktokay', 1),
  (8, 1, 'Koktokay', 1),
  (8, 2, 'Urumqi', 0),
  (9, 1, 'Urumqi', 0),
  (9, 2, 'Sayram Lake', 1),
  (10, 1, 'Sayram Lake', 0),
  (10, 2, 'Yining', 1),
  (11, 1, 'Yining', 0),
  (11, 2, 'Kalajun Grassland', 0),
  (11, 3, 'Nalati', 1),
  (12, 1, 'Nalati', 0),
  (12, 2, 'Bayinbulak', 1),
  (13, 1, 'Bayinbulak', 0),
  (13, 2, 'Kuqa', 1),
  (14, 1, 'Kuqa', 0),
  (14, 2, 'Kizil Caves', 1),
  (14, 3, 'Kuqa', 0),
  (15, 1, 'Kuqa', 0),
  (15, 2, 'Kashgar', 1),
  (17, 1, 'Kashgar', 0),
  (17, 2, 'Baisha Lake', 0),
  (17, 3, 'Karakul Lake', 1),
  (17, 4, 'Tashkurgan', 0),
  (18, 1, 'Tashkurgan', 0),
  (18, 2, 'Khunjerab Pass', 1),
  (18, 3, 'Tashkurgan', 0),
  (19, 1, 'Tashkurgan', 0),
  (19, 2, 'Kashgar', 1),
  (20, 1, 'Kashgar', 0),
  (20, 2, 'Urumqi', 0),
  (20, 3, 'Turpan', 1),
  (22, 1, 'Turpan', 1),
  (22, 2, 'Urumqi', 0))
INSERT INTO day_cities (day_id, position, city_id, main)
SELECT days.id, r.position, cities.id, r.main
FROM r
JOIN trips ON trips.slug = 'xinjiang'
JOIN days ON days.trip_id = trips.id AND days.position = r.day
JOIN cities ON cities.name = r.city;
