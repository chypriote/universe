// Upload trip photos and their thumbnails to the R2 bucket and rewrite
// src/data/photos.json. Usage: node scripts/upload-photos.mjs <photos-dir>
// <photos-dir> holds one folder per trip slug. Needs `wrangler login`.
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const BUCKET = 'nico-zhongguo-photos';
const CONCURRENCY = 6;
const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const run = promisify(execFile);

const photosDir = process.argv[2];
if (!photosDir) {
  console.error('Usage: node scripts/upload-photos.mjs <photos-dir>');
  process.exit(1);
}

async function put(key, file, contentType) {
  await run(
    'npx',
    [
      'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--remote',
      '--file', file,
      '--content-type', contentType,
      '--cache-control', 'public, max-age=31536000, immutable',
    ],
    { shell: process.platform === 'win32' },
  );
}

async function pool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
    }),
  );
}

const tmp = await mkdtemp(join(tmpdir(), 'photos-'));
const jobs = [];
const manifest = {};
const previous = JSON.parse(await readFile('src/data/photos.json', 'utf8').catch(() => '{}'));

for (const slug of (await readdir(photosDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  manifest[slug] = [];
  const names = (await readdir(join(photosDir, slug)))
    .filter((name) => extname(name).toLowerCase() in IMAGE_TYPES)
    .sort();

  for (const name of names) {
    const file = join(photosDir, slug, name);
    const { width, height, orientation = 1 } = await sharp(file).metadata();
    const swapped = orientation >= 5;
    const { city, cover } = previous[slug]?.find((photo) => photo.name === name) ?? {};
    manifest[slug].push({
      name,
      width: swapped ? height : width,
      height: swapped ? width : height,
      ...(city && { city }),
      ...(cover && { cover }),
    });
    jobs.push({ slug, name, file });
  }
}

await writeFile('src/data/photos.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote src/data/photos.json (${jobs.length} photos)`);

let done = 0;
await pool(jobs, async ({ slug, name, file }) => {
  const { width, height } = manifest[slug].find((photo) => photo.name === name);
  const landscape = width >= height;
  const thumb = join(tmp, `${slug}-${name}.webp`);
  await sharp(file).rotate().resize({ width: landscape ? 960 : 480 }).webp().toFile(thumb);
  await put(`trips/${slug}/${name}`, file, IMAGE_TYPES[extname(name).toLowerCase()]);
  await put(`thumbs/${slug}/${name}.webp`, thumb, 'image/webp');
  console.log(`${++done}/${jobs.length} ${slug}/${name}`);
});
