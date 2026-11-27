// Builds src/data/china-map.json from Natural Earth (public domain, naturalearthdata.com).
// Usage: node scripts/build-china-map.mjs <admin_1 geojson> <admin_0_map_units geojson>
//   admin_1: ne_10m_admin_1_states_provinces.geojson
//   map units: ne_10m_admin_0_map_units.geojson (for Hong Kong and Macao)
import { readFileSync, writeFileSync } from 'node:fs';
import { albers } from '../src/lib/china-projection.js';

const [admin1Path, unitsPath] = process.argv.slice(2);
if (!admin1Path || !unitsPath) {
  console.error('Usage: node scripts/build-china-map.mjs <admin_1 geojson> <map_units geojson>');
  process.exit(1);
}

const WIDTH = 1000;
const TOLERANCE = 0.7;
const NAMES = { 'Inner Mongol': 'Inner Mongolia', Xizang: 'Tibet' };
const SKIP = new Set(['Paracel Islands']);

const load = (path) => JSON.parse(readFileSync(path, 'utf8')).features;
const polygons = (geometry) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

const entries = [];
for (const f of load(admin1Path)) {
  const p = f.properties;
  if (p.admin === 'China' && !SKIP.has(p.name)) {
    entries.push({
      name: NAMES[p.name] ?? p.name,
      zh: p.name_zh.replace(/(省|市|壮族自治区|回族自治区|维吾尔自治区|自治区)$/, ''),
      polys: polygons(f.geometry),
    });
  } else if (p.admin === 'Taiwan') {
    let taiwan = entries.find((e) => e.name === 'Taiwan');
    if (!taiwan) entries.push((taiwan = { name: 'Taiwan', zh: '台湾', polys: [], outline: true }));
    taiwan.polys.push(...polygons(f.geometry));
  }
}
for (const f of load(unitsPath)) {
  const p = f.properties;
  if (p.NAME === 'Hong Kong' || p.NAME === 'Macao') {
    entries.push({ name: p.NAME, zh: p.NAME_ZH, polys: polygons(f.geometry) });
  }
}

const project = (ring) => ring.map(([lng, lat]) => albers(lng, lat));

// Bounds from the mainland, so Taiwan and the islands never set the frame.
let minX = Infinity,
  minY = Infinity,
  maxX = -Infinity,
  maxY = -Infinity;
for (const e of entries) {
  for (const poly of e.polys) {
    for (const [x, y] of project(poly[0])) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}
const scale = WIDTH / (maxX - minX);
const tx = -minX * scale;
const ty = -minY * scale;
const height = Math.ceil((maxY - minY) * scale);

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  let index = 0,
    max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d =
      len === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

const fmt = (v) => Math.round(v * 10) / 10;
function pathData(polys) {
  let d = '';
  for (const poly of polys) {
    const ring = project(poly[0]).map(([x, y]) => [x * scale + tx, y * scale + ty]);
    const small = simplify(ring, TOLERANCE);
    // Keep tiny regions (Hong Kong, Macao) as at least a triangle.
    const pts = small.length >= 4 ? small : simplify(ring, 0.05);
    if (pts.length < 4) continue;
    d +=
      'M' +
      pts
        .slice(0, -1)
        .map(([x, y]) => `${fmt(x)} ${fmt(y)}`)
        .join('L') +
      'Z';
  }
  return d;
}

const regions = entries
  .map((e) => ({
    name: e.name,
    zh: e.zh,
    ...(e.outline ? { outline: true } : {}),
    d: pathData(e.polys),
  }))
  .filter((r) => r.d)
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  new URL('../src/data/china-map.json', import.meta.url),
  JSON.stringify({
    width: WIDTH,
    height,
    scale: +scale.toFixed(4),
    tx: +tx.toFixed(2),
    ty: +ty.toFixed(2),
    regions,
  }) + '\n',
);
console.log(`${regions.length} regions, ${WIDTH}x${height}`);
