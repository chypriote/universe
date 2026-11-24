-- Where a Province Cover is centred in the home map frame, in percent (50, 50 is the centre).
ALTER TABLE province_covers ADD COLUMN focus_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE province_covers ADD COLUMN focus_y INTEGER NOT NULL DEFAULT 50;
