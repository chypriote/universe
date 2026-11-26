export function normalizeCityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’′]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type PlaceName = {
  zh: string;
  pinyin: string;
};

const ALIASES: Record<string, string> = {
  macao: 'macau',
  'shangri la': 'shangri-la',
};

const PLACES: Record<string, PlaceName> = {
  // Cities
  beijing: { zh: '北京', pinyin: 'Běijīng' },
  pingyao: { zh: '平遥', pinyin: 'Píngyáo' },
  xian: { zh: '西安', pinyin: "Xī'ān" },
  chengdu: { zh: '成都', pinyin: 'Chéngdū' },
  huanglong: { zh: '黄龙', pinyin: 'Huánglóng' },
  jiuzhaigou: { zh: '九寨沟', pinyin: 'Jiǔzhàigōu' },
  leshan: { zh: '乐山', pinyin: 'Lèshān' },
  chongqing: { zh: '重庆', pinyin: 'Chóngqìng' },
  wulong: { zh: '武隆', pinyin: 'Wǔlóng' },
  zhangjiajie: { zh: '张家界', pinyin: 'Zhāngjiājiè' },
  changsha: { zh: '长沙', pinyin: 'Chángshā' },
  nanchang: { zh: '南昌', pinyin: 'Nánchāng' },
  'hong kong': { zh: '香港', pinyin: 'Xiānggǎng' },
  guangzhou: { zh: '广州', pinyin: 'Guǎngzhōu' },
  macau: { zh: '澳門', pinyin: 'Àomén' },
  zhuhai: { zh: '珠海', pinyin: 'Zhūhǎi' },
  humen: { zh: '虎门', pinyin: 'Hǔmén' },
  shenzhen: { zh: '深圳', pinyin: 'Shēnzhèn' },
  kunming: { zh: '昆明', pinyin: 'Kūnmíng' },
  dali: { zh: '大理', pinyin: 'Dàlǐ' },
  lijiang: { zh: '丽江', pinyin: 'Lìjiāng' },
  'shangri-la': { zh: '香格里拉', pinyin: 'Xiānggélǐlā' },
  xining: { zh: '西宁', pinyin: 'Xīníng' },
  'chaka town': { zh: '茶卡', pinyin: 'Chákǎ' },
  'charhan salt lake': { zh: '察尔汗盐湖', pinyin: "Chá'ěrhán Yánhú" },
  'riyue shan': { zh: '日月山', pinyin: 'Rìyuè Shān' },
  yadan: { zh: '雅丹', pinyin: 'Yǎdān' },
  dunhuang: { zh: '敦煌', pinyin: 'Dūnhuáng' },
  jiayuguan: { zh: '嘉峪关', pinyin: 'Jiāyùguān' },
  zhangye: { zh: '张掖', pinyin: 'Zhāngyè' },
  qilian: { zh: '祁连', pinyin: 'Qílián' },
  lanzhou: { zh: '兰州', pinyin: 'Lánzhōu' },
  huanglongjiuzhaigou: { zh: '黄龙九寨站', pinyin: 'Huánglóng Jiǔzhài Zhàn' },
  shanghai: { zh: '上海', pinyin: 'Shànghǎi' },
  nantong: { zh: '南通', pinyin: 'Nántōng' },
  nanjing: { zh: '南京', pinyin: 'Nánjīng' },
  suzhou: { zh: '苏州', pinyin: 'Sūzhōu' },
  hangzhou: { zh: '杭州', pinyin: 'Hángzhōu' },
  huangshan: { zh: '黄山', pinyin: 'Huángshān' },
  hongcun: { zh: '宏村', pinyin: 'Hóngcūn' },
};

function placeKey(name: string): string {
  const normalized = normalizeCityName(name);
  return ALIASES[normalized] ?? normalized;
}

export function getPlaceName(name: string): PlaceName {
  return PLACES[placeKey(name)] ?? { zh: '', pinyin: '' };
}
