const RAD = Math.PI / 180;
const LON0 = 105;
const LAT0 = 36;
const PARALLEL_1 = 25;
const PARALLEL_2 = 47;

const n = (Math.sin(PARALLEL_1 * RAD) + Math.sin(PARALLEL_2 * RAD)) / 2;
const c = Math.cos(PARALLEL_1 * RAD) ** 2 + 2 * n * Math.sin(PARALLEL_1 * RAD);
const rho = (lat) => Math.sqrt(c - 2 * n * Math.sin(lat * RAD)) / n;

/**
 * Albers equal-area conic projection centred on China.
 * Returns unscaled planar coordinates, y pointing down.
 * @param {number} lng
 * @param {number} lat
 * @returns {[number, number]}
 */
export function albers(lng, lat) {
  const theta = n * (lng - LON0) * RAD;
  const r = rho(lat);
  return [r * Math.sin(theta), -(rho(LAT0) - r * Math.cos(theta))];
}
