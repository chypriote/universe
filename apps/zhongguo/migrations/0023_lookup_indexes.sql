-- Each count or check below runs once per City, Activity or Photo: without an index it scans the whole table each time.
-- The admin Cities page counts a City's uses and the Activities page an Activity's uses.
CREATE INDEX photos_city ON photos (city_id);
CREATE INDEX plan_photos_city ON plan_photos (city_id);
CREATE INDEX days_city ON days (city_id);
CREATE INDEX day_cities_city ON day_cities (city_id);
CREATE INDEX plan_days_city ON plan_days (city_id);
CREATE INDEX plan_day_cities_city ON plan_day_cities (city_id);
CREATE INDEX trip_hotels_city ON trip_hotels (city_id);
CREATE INDEX trip_restaurants_city ON trip_restaurants (city_id);
CREATE INDEX airports_city ON airports (city_id);
CREATE INDEX day_activities_activity ON day_activities (activity_id);
CREATE INDEX plan_day_activities_activity ON plan_day_activities (activity_id);
CREATE INDEX plan_highlight_photos_photo ON plan_highlight_photos (photo_id);
