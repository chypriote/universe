# Photos

Trip photos live in the R2 bucket `nico-zhongguo-photos`, not in git.

- `trips/<slug>/<file>`: the original, opened by the lightbox.
- `thumbs/<slug>/<file>.webp`: the thumbnail shown in grids.

The `photos` table in D1 lists every photo with its size, date, optional title and its City (or, for an On the way photo, its Province). The Journal reads it; it does not read the bucket. `PHOTOS_URL` is the public base URL of the bucket, with no trailing slash: a Worker secret in production, `.dev.vars` locally. The Worker also has the bucket as the `PHOTOS` R2 binding, which only the admin writes.

## Admin

`/admin/photos` uploads, edits and deletes Photos (`/api/admin/photos`, behind the Owner login). The Journal holds the rules (`src/lib/journal/admin.ts`); the routes and the page hold none.

- Upload: one file per request. The browser makes the `.webp` thumbnail (960 px wide for landscape, 480 px otherwise). The Worker reads the date from EXIF (`DateTimeOriginal`), then from the file name (`2025-03-29-09-02.jpg`, `IMG_20250329_090212.jpg`, `IMG20250329090212.jpg`, `mmexport<Unix time>.jpg`), then from the form; with none, the upload is refused. Width and height come from the file, EXIF orientation applied. Only `.jpg`, `.jpeg`, `.png` and `.webp`.
- A file with the name of a Photo already in the Trip is refused ("exists") until the upload is repeated with the overwrite flag. An overwrite replaces both objects and the size, keeps every field set by hand, and bumps `photos.version`: the Journal adds `?v=<version>` to the URLs of a version above 1, since the bucket serves objects as immutable. It is refused when the new orientation breaks the Trip Cover (landscape) or a Highlight Photo (portrait).
- Delete: a Trip Cover, Highlight Photo or Province Cover is kept and listed with the Photos that could replace it. The delete goes on once a replacement is picked.
- A City is added from the same page; it is usable at once.

## Day Photos

`day_photos` holds the ordered Photos of each Day (`migrations/0005_day_photos.sql` filled it from the date rule). A Photo is on at most one Day; one on no Day stays in the Gallery under its Trip. A new upload goes at the end of the Day of its date, an edited date moves a Photo to the Day of the new date (or to no Day), and a delete takes it off its Day. A Hidden Day keeps its Photos. `/admin/trips/<slug>` places them by drag and drop; each drop saves the Day lists it changed.
