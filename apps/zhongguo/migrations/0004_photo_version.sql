-- Bumped when an upload replaces a Photo's files, so its URLs change (the bucket serves objects as immutable).
ALTER TABLE photos ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
