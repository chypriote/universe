-- Time of day a Photo was taken; null when unknown. Uploads fill it from the EXIF capture time.
ALTER TABLE photos ADD COLUMN time TEXT CHECK (time IN ('morning', 'afternoon', 'evening'));
