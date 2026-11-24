# Photos

Trip photos live in the R2 bucket `nico-zhongguo-photos`, not in git.

- `trips/<slug>/<file>`: the original, opened by the lightbox.
- `thumbs/<slug>/<file>.webp`: the thumbnail shown in grids.

The `photos` table in D1 lists every photo with its size, date, optional title and its City (or, for an On the way photo, its Province). The Journal reads it; it does not read the bucket. `PHOTOS_URL` is the public base URL of the bucket, with no trailing slash: a Worker secret in production, `.dev.vars` locally. The Worker also has the bucket as the `PHOTOS` R2 binding, unused until the admin.

A photo's City, title and Province Cover are rows in D1. There is no screen to edit them yet (the admin comes in later parts of #56); until then, change them with SQL, for example `npx wrangler d1 execute DB --remote --command "UPDATE photos SET city_id = ... WHERE ..."`.

## Add photos

`scripts/upload-photos.mjs <photos-dir>` uploads photos and thumbnails to the bucket (`npx wrangler login` first; `<photos-dir>` holds one folder per trip slug). It still writes `src/data/photos.json`, which nothing reads any more, so the new photos need rows in `photos` until the admin upload (#59) replaces the script. The script uploads every photo again each time.
