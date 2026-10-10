// Builds src/shapes.ts (key background outlines) and package/THIRD-PARTY-NOTICES.txt from open map data.
// Run with `npm run shapes` after changing clocks in src/zones.ts. Downloads are cached in GEO_CACHE (default: OS temp dir).
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLOCKS } from '../src/zones.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.GEO_CACHE ?? join(tmpdir(), 'world-clock-geo');
const CDN = 'https://cdn.jsdelivr.net/gh';
const SOURCES = {
  'ne50.geojson': `${CDN}/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson`,
  // Natural Earth's India point-of-view edition draws India's complete official border.
  'ne10_ind.geojson': `${CDN}/nvkelso/natural-earth-vector@master/geojson/ne_10m_admin_0_countries_ind.geojson`,
  'f1-circuits.geojson': `${CDN}/bacinger/f1-circuits@master/f1-circuits.geojson`,
  'LICENSE-f1': `${CDN}/bacinger/f1-circuits@master/LICENSE.md`,
};

const BOX = 100;
// Taken from the 1:10m India point-of-view edition: India's complete official border, and Singapore is too small for 1:50m.
const DETAILED = new Set(['IND', 'SGP']);

async function load(name) {
  const file = join(CACHE, name);
  if (!existsSync(file)) {
    await mkdir(CACHE, { recursive: true });
    console.log(`Downloading ${SOURCES[name]}`);
    const response = await fetch(SOURCES[name]);
    if (!response.ok) throw new Error(`${SOURCES[name]}: HTTP ${response.status}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  return readFile(file, 'utf8');
}

const mercatorY = (lat) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
/** Shifts lon to within ±180° of ref so countries crossing the antimeridian (Russia) stay in one piece. */
const unwrap = (lon, ref) => ((((lon - ref) % 360) + 540) % 360) - 180 + ref;
const round1 = (v) => Math.round(v * 10) / 10;

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(sum / 2);
}

function bounds(points) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Maps projected points (y = north) into the BOX, centred, preserving aspect ratio. */
function fitter(points) {
  const { minX, minY, maxX, maxY } = bounds(points);
  const scale = BOX / Math.max(maxX - minX, maxY - minY);
  const offX = (BOX - (maxX - minX) * scale) / 2;
  const offY = (BOX - (maxY - minY) * scale) / 2;
  return ([x, y]) => [offX + (x - minX) * scale, offY + (maxY - y) * scale];
}

function distanceToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas–Peucker simplification. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanceToSegment(points[i], points[a], points[b]);
      if (d > max) [max, index] = [d, i];
    }
    if (max > epsilon) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const toPath = (points, close) =>
  `M${points.map(([x, y]) => `${round1(x)} ${round1(y)}`).join('L')}${close ? 'Z' : ''}`;

function countryShape(feature, { at, clip }) {
  const { type, coordinates } = feature.geometry;
  const inClip = (ring) => {
    if (!clip) return true;
    const { minX, minY, maxX, maxY } = bounds(ring);
    const [lon, lat] = [(minX + maxX) / 2, (minY + maxY) / 2];
    return lon >= clip[0] && lon <= clip[2] && lat >= clip[1] && lat <= clip[3];
  };
  const project = ([lon, lat]) => [unwrap(lon, at[0]), mercatorY(lat)];

  let polygons = (type === 'Polygon' ? [coordinates] : coordinates)
    .filter((polygon) => inClip(polygon[0]))
    .map((polygon) => polygon.map((ring) => ring.map(project)));
  // Drop specks (tiny islands) before fitting so they don't shrink the main outline.
  const largest = polygons.reduce((max, polygon) => Math.max(max, ringArea(polygon[0])), 0);
  polygons = polygons.filter((polygon) => ringArea(polygon[0]) >= largest * 0.0005);

  const fit = fitter(polygons.flatMap((polygon) => polygon[0]));
  const rings = polygons
    .flat()
    .map((ring) => simplify(ring.map(fit), 0.3))
    .filter((ring) => ring.length >= 4 && ringArea(ring) >= 0.4);
  return {
    kind: 'area',
    path: rings.map((ring) => toPath(ring, true)).join(''),
    dot: fit(project(at)).map(round1),
  };
}

function circuitShape(feature) {
  const line = feature.geometry.coordinates.map(([lon, lat]) => [lon, mercatorY(lat)]);
  const fit = fitter(line);
  const points = simplify(line.map(fit), 0.25);
  const [first, last] = [points[0], points[points.length - 1]];
  return { kind: 'line', path: toPath(points, Math.hypot(first[0] - last[0], first[1] - last[1]) < 3) };
}

const GLOBE = {
  kind: 'line',
  path: 'M2 50a48 48 0 1 0 96 0a48 48 0 1 0-96 0M50 2a20 48 0 1 0 0 96a20 48 0 1 0 0-96M50 2a38 48 0 1 0 0 96a38 48 0 1 0 0-96M2 50H98M8.4 26H91.6M8.4 74H91.6',
};

const countries = JSON.parse(await load('ne50.geojson')).features;
const detailed = JSON.parse(await load('ne10_ind.geojson')).features;
const circuits = JSON.parse(await load('f1-circuits.geojson')).features;

const shapes = {};
for (const clock of CLOCKS) {
  const source = clock.shape;
  if (source.kind === 'globe') {
    shapes[clock.id] = GLOBE;
  } else if (source.kind === 'circuit') {
    const feature = circuits.find((f) => f.properties.id === source.circuit);
    if (!feature) throw new Error(`${clock.id}: circuit ${source.circuit} not found`);
    shapes[clock.id] = circuitShape(feature);
  } else {
    const pool = DETAILED.has(source.iso) ? detailed : countries;
    const feature = pool.find((f) => f.properties.ADM0_A3 === source.iso);
    if (!feature) throw new Error(`${clock.id}: country ${source.iso} not found`);
    shapes[clock.id] = countryShape(feature, source);
  }
}

const header = [
  '// Generated by scripts/generate-shapes.mjs (npm run shapes). Do not edit by hand.',
  '// Country outlines: Natural Earth, public domain. Circuits: github.com/bacinger/f1-circuits, MIT (see package/THIRD-PARTY-NOTICES.txt).',
  '',
  '/** Outline in a 100x100 box: `area` is filled (countries), `line` is stroked only (circuits, globe). `dot` marks the city. */',
  "export type Shape = { kind: 'area' | 'line'; path: string; dot?: readonly [number, number] };",
  '',
  'export const SHAPES: Readonly<Record<string, Shape>> = {',
];
const body = CLOCKS.map((clock) => `  ${JSON.stringify(clock.id)}: ${JSON.stringify(shapes[clock.id])},`);
await writeFile(join(ROOT, 'src', 'shapes.ts'), `${[...header, ...body, '};'].join('\n')}\n`);

const notices = [
  'World Clock uses the following map data.',
  '',
  'Natural Earth (https://www.naturalearthdata.com) - public domain.',
  'Country outlines come from the 1:50m Admin 0 countries dataset; India and Singapore use the 1:10m India point-of-view edition.',
  '',
  'f1-circuits (https://github.com/bacinger/f1-circuits) - circuit layouts, used under the MIT License:',
  '',
  (await load('LICENSE-f1')).trim(),
  '',
];
await writeFile(join(ROOT, 'package', 'THIRD-PARTY-NOTICES.txt'), notices.join('\n'));

const size = Object.values(shapes).reduce((sum, shape) => sum + shape.path.length, 0);
console.log(`Wrote ${CLOCKS.length} shapes (${Math.round(size / 1024)} KB of path data) to src/shapes.ts`);
