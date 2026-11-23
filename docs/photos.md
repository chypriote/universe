# Photos

Trip photos live in the R2 bucket `nico-zhongguo-photos`, not in git.

- `trips/<slug>/<file>`: the original, opened by the lightbox.
- `thumbs/<slug>/<file>.webp`: the thumbnail shown in grids.

`src/data/photos.json` lists every photo with its size. The build reads it. It does not read the bucket.
A photo can have an optional `city`, for example `"city": "Zhangjiajie"`. The gallery then uses it instead of the city of the photo's date. The upload script keeps it.

## Set cities

Put `PHOTOS_URL=<bucket url>` in `.env`. Run `node --env-file=.env scripts/photo-admin.mjs` and open http://localhost:4322. Pick a city per photo, or click photos and set one city on all of them. Save, then commit `src/data/photos.json`.
The build needs `PHOTOS_URL`, the public base URL of the bucket, with no trailing slash. Locally, set it in `.env`; Astro reads it from there.
The hero image is `src/assets/hero.jpg`. Astro optimizes it at build.

## Add photos

1. Put them in `<photos-dir>/<trip-slug>/`.
2. Run `npx wrangler login`, then `node scripts/upload-photos.mjs <photos-dir>`.
3. Commit `src/data/photos.json`.

The script uploads every photo again each time.
