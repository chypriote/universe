import { describe, expect, it } from 'vitest';
import { pinyinOf } from './pinyin';

describe('pinyinOf', () => {
  it('makes one word of a name of up to 3 hanzi, with tone marks and a capital', () => {
    expect(pinyinOf('黄石寨')).toBe('Huángshízhài');
    expect(pinyinOf('正阳门')).toBe('Zhèngyángmén');
  });

  it('splits a longer name in words of 2, a last single joining the word before', () => {
    expect(pinyinOf('平遥古城')).toBe('Píngyáo Gǔchéng');
    expect(pinyinOf('屯溪老街')).toBe('Túnxī Lǎojiē');
    expect(pinyinOf('大雁塔广场')).toBe('Dàyàn Tǎguǎngchǎng');
  });

  it('gives nothing for an empty name', () => {
    expect(pinyinOf('  ')).toBe('');
  });
});
