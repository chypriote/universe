-- The own pictures of an Activity (issue #207): files under activities/<activity id>/ in the photo bucket, in order, the first
-- is the main one. They are not Photos: no Trip, never in the Gallery.
CREATE TABLE activity_pictures (
    id INTEGER PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities (id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (activity_id, name)
);
