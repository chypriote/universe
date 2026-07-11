export interface FlightSearchRow {
  id: string;
  airport: string;
  stops: 'stop' | 'nostop';
  price: number;
  outboundDate: string;
  returnDate: string;
  searchedOn: string;
  createdAt: string;
  cityLabel: string;
  isDirect: boolean;
  isCityLowest: boolean;
  priceColor: string;
}

export const AIRPORT_LABELS: Record<string, string> = {
  CAN: '广州 Guangzhou',
  CKG: '重庆 Chongqing',
  CSX: '长沙 Changsha',
  HGH: '杭州 Hangzhou',
  KHN: '南昌 Nanchang',
  KMG: '昆明 Kunming',
  KWL: '贵林 Guilin',
  LXA: '城关 Lhasa',
  NKG: '南京 Nanjing',
  PEK: '北京 Beijing',
  PKX: '北京 Beijing DX',
  PVG: '上海 Shanghai',
  TFU: '成都 Chengdu',
  WUH: '武汉 Wuhan',
  XIY: '西安 Xian',
  XMN: '厦门 Xiamen',
};

export function getAirportLabel(airport: string): string {
  return AIRPORT_LABELS[airport] ?? airport;
}

export function priceToColor(price: number, minPrice: number, maxPrice: number): string {
  if (maxPrice <= minPrice) {
    return 'oklch(0.52 0.135 135)';
  }

  const ratio = (price - minPrice) / (maxPrice - minPrice);
  const hue = 135 - ratio * 135;
  const lightness = 0.52 - ratio * 0.05;
  return `oklch(${lightness} 0.135 ${hue})`;
}
