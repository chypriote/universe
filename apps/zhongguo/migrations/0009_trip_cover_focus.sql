-- Where the Trip Cover is centred in the Trip page header, in percent (50, 50 is the centre).
ALTER TABLE trips ADD COLUMN cover_focus_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE trips ADD COLUMN cover_focus_y INTEGER NOT NULL DEFAULT 50;
