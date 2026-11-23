/** Longitude, latitude for itinerary city names. */
type LngLat = readonly [number, number];

const CITY_COORDINATES: Record<string, LngLat> = {
  beijing: [116.4074, 39.9042],
  pingyao: [112.1754, 37.2047],
  xian: [108.9398, 34.3416],
  chengdu: [104.0665, 30.5728],
  huanglong: [103.8319, 32.7419],
  jiuzhaigou: [103.9169, 33.26],
  leshan: [103.7655, 29.5521],
  chongqing: [106.5516, 29.563],
  wulong: [107.76, 29.325],
  zhangjiajie: [110.4792, 29.117],
  changsha: [112.9388, 28.2282],
  nanchang: [115.8582, 28.682],
  'hong kong': [114.1694, 22.3193],
  guangzhou: [113.2644, 23.1291],
  macau: [113.5439, 22.1987],
  humen: [113.6734, 22.8198],
  shenzhen: [114.0579, 22.5431],
  kunming: [102.8329, 24.8801],
  dali: [100.2676, 25.6065],
  lijiang: [100.233, 26.8721],
  'shangri-la': [99.7087, 27.8297],
  xining: [101.7782, 36.6171],
  'chaka town': [99.0733, 36.7894],
  'charhan salt lake': [95.135, 36.8],
  'qinghai lake': [100.2, 36.9],
  'riyue shan': [101.05, 36.45],
  yadan: [93.35, 38.87],
  dunhuang: [94.6619, 40.1421],
  jiayuguan: [98.2892, 39.7732],
  zhangye: [100.4498, 38.9256],
  lanzhou: [103.8236, 36.0581],
  shanghai: [121.4737, 31.2304],
  nantong: [120.8943, 32.0162],
  nanjing: [118.7969, 32.0603],
  suzhou: [120.5853, 31.2989],
  hangzhou: [120.1551, 30.2741],
  huangshan: [118.168, 30.132],
  hongcun: [117.9865, 30.0042],
};

const ALIASES: Record<string, string> = {
  macao: 'macau',
  "xi'an": 'xian',
  'shangri la': 'shangri-la',
};

export function normalizeCityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’′]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCityLngLat(name: string): LngLat {
  const normalized = normalizeCityName(name);
  const key = ALIASES[normalized] ?? normalized;
  const coords = CITY_COORDINATES[key];

  if (!coords) {
    throw new Error(`Missing coordinates for city "${name}" (normalized: "${key}")`);
  }

  return coords;
}
