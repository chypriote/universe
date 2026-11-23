import { albers } from '@/lib/china-projection.js';
import map from '@/data/china-map.json';

export type MapRegionShape = { name: string; zh: string; d: string; outline?: boolean };

export const CHINA_MAP = map as {
  width: number;
  height: number;
  scale: number;
  tx: number;
  ty: number;
  regions: MapRegionShape[];
};

/** Map a longitude and latitude to x, y in the map's viewBox. */
export function projectLngLat(lng: number, lat: number): [number, number] {
  const [x, y] = albers(lng, lat);
  return [x * CHINA_MAP.scale + CHINA_MAP.tx, y * CHINA_MAP.scale + CHINA_MAP.ty];
}

/** Chinese name of a region (province, municipality or special administrative region). */
export function getRegionZh(name: string): string {
  return CHINA_MAP.regions.find((region) => region.name === name)?.zh ?? '';
}
