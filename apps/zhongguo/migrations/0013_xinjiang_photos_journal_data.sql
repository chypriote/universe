-- One freely licensed Wikimedia Commons photo per City of the Xinjiang plan. The files are in the photo bucket under trips/xinjiang/ and thumbs/xinjiang/. The title holds the credit.
WITH p (name, width, height, date, title, city) AS (VALUES
  ('urumqi.jpg', 2400, 1358, '2027-09-11', 'Urumqi · photo Albertaont, CC BY-SA 4.0', 'Urumqi'),
  ('tianchi.jpg', 1600, 772, '2027-09-12', 'Tianchi · photo zengsx, CC BY-SA 3.0', 'Tianchi'),
  ('urho-ghost-city.jpg', 1687, 1129, '2027-09-13', 'Urho Ghost City · photo M3th04, CC0', 'Urho Ghost City'),
  ('karamay.jpg', 2400, 1800, '2027-09-13', 'Karamay · photo Rart, CC BY-SA 4.0', 'Karamay'),
  ('burqin.jpg', 1920, 1080, '2027-09-14', 'Burqin · photo 余华峰, CC BY-SA 3.0', 'Burqin'),
  ('kanas-lake.jpg', 2400, 1800, '2027-09-15', 'Kanas Lake · photo Fanghong, CC BY-SA 3.0', 'Kanas'),
  ('hemu-village.jpg', 2400, 1799, '2027-09-16', 'Hemu village · photo Yanxutong1215, CC BY-SA 4.0', 'Hemu'),
  ('koktokay.jpg', 2400, 1800, '2027-09-17', 'Koktokay · photo Yanxutong1215, CC BY-SA 4.0', 'Koktokay'),
  ('sayram-lake.jpg', 2400, 1600, '2027-09-19', 'Sayram Lake · photo Fumikas Sagisavas, CC0', 'Sayram Lake'),
  ('yining.jpg', 2400, 1600, '2027-09-20', 'Yining · photo 0999, CC BY-SA 3.0', 'Yining'),
  ('kalajun-grassland.jpg', 2048, 1063, '2027-09-21', 'Kalajun Grassland · photo Akira CA, CC BY-SA 4.0', 'Kalajun Grassland'),
  ('nalati.jpg', 2016, 1512, '2027-09-21', 'Nalati · photo Yoshi Canopus, CC0', 'Nalati'),
  ('bayinbulak.jpg', 2400, 1350, '2027-09-22', 'Bayinbulak · photo MichaelE, CC BY-SA 4.0', 'Bayinbulak'),
  ('kuqa.jpg', 1800, 1200, '2027-09-23', 'Kuqa · photo Windmemories, CC BY-SA 4.0', 'Kuqa'),
  ('kizil-caves.jpg', 2400, 1800, '2027-09-24', 'Kizil Caves · photo Hiroki Ogawa, CC BY 3.0', 'Kizil Caves'),
  ('kashgar.jpg', 2400, 1600, '2027-09-26', 'Kashgar old city · photo MasaneMiyaPA, CC BY-SA 4.0', 'Kashgar'),
  ('baisha-lake.jpg', 2400, 1800, '2027-09-27', 'Baisha Lake · photo Hiroki Ogawa, CC BY 3.0', 'Baisha Lake'),
  ('karakul-lake.jpg', 2400, 1350, '2027-09-27', 'Karakul Lake · photo rheins, CC BY 3.0', 'Karakul Lake'),
  ('tashkurgan.jpg', 2400, 1600, '2027-09-27', 'Tashkurgan Stone City · photo rheins, CC BY 3.0', 'Tashkurgan'),
  ('khunjerab-pass.jpg', 2400, 1600, '2027-09-28', 'Khunjerab Pass · photo Sheikh Danish Ejaz, CC BY-SA 4.0', 'Khunjerab Pass'),
  ('turpan.jpg', 2400, 1800, '2027-10-01', 'Jiaohe ruins, Turpan · photo Hiroooooo, CC BY-SA 3.0', 'Turpan'))
INSERT INTO photos (trip_id, name, width, height, date, title, city_id)
SELECT trips.id, p.name, p.width, p.height, p.date, p.title, cities.id
FROM p
JOIN trips ON trips.slug = 'xinjiang'
JOIN cities ON cities.name = p.city;

INSERT INTO day_photos (day_id, position, photo_id)
SELECT days.id, ROW_NUMBER() OVER (PARTITION BY days.id ORDER BY photos.name), photos.id
FROM photos
JOIN trips ON trips.id = photos.trip_id AND trips.slug = 'xinjiang'
JOIN days ON days.trip_id = photos.trip_id AND days.date = photos.date;
