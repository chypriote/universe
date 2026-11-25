-- The Season of a Province: one bit per month, bit 0 = January.
ALTER TABLE provinces ADD COLUMN season INTEGER NOT NULL DEFAULT 0;

-- The Airports of a City with flights from Paris. direct_weekdays: one bit per weekday with a direct flight, bit 0 = Monday.
CREATE TABLE airports (
    code TEXT PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES cities (id),
    direct_weekdays INTEGER NOT NULL DEFAULT 0
);

-- The Airports china.js searched, for the Cities that exist. Direct days from its notes.
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'PEK', id, 127 FROM cities WHERE name = 'Beijing';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'PKX', id, 0 FROM cities WHERE name = 'Beijing';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'PVG', id, 127 FROM cities WHERE name = 'Shanghai';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'TFU', id, 1 FROM cities WHERE name = 'Chengdu';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'CAN', id, 9 FROM cities WHERE name = 'Guangzhou';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'NKG', id, 4 FROM cities WHERE name = 'Nanjing';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'XMN', id, 8 FROM cities WHERE name = 'Xiamen';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'XIY', id, 8 FROM cities WHERE name = 'Xi''an';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'CKG', id, 32 FROM cities WHERE name = 'Chongqing';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'HGH', id, 0 FROM cities WHERE name = 'Hangzhou';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'KHN', id, 0 FROM cities WHERE name = 'Nanchang';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'KMG', id, 0 FROM cities WHERE name = 'Kunming';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'WUH', id, 0 FROM cities WHERE name = 'Wuhan';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'URC', id, 0 FROM cities WHERE name = 'Urumqi';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'CSX', id, 0 FROM cities WHERE name = 'Changsha';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'KWL', id, 0 FROM cities WHERE name = 'Guilin';
INSERT OR IGNORE INTO airports (code, city_id, direct_weekdays) SELECT 'LXA', id, 0 FROM cities WHERE name = 'Lhasa';
