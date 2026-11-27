import { pinyin } from 'pinyin-pro';

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** A syllable that starts with a, o or e after another one needs an apostrophe: Xī'ān, not Xīān. */
const joinSyllables = (word: string[]) =>
  word.reduce(
    (joined, syllable, index) =>
      index > 0 && /^[aoeāáǎàōóǒòēéěè]/i.test(syllable)
        ? `${joined}'${syllable}`
        : joined + syllable,
    '',
  );

/**
 * Pinyin with tone marks for a Chinese name, in the style of the Atlas: up to 3 characters make one word
 * (Huángshízhài), longer names go in words of 2 with a last single joined to the word before (Píngyáo Gǔchéng).
 * Characters that are not hanzi are kept as they are. A guess the Owner can correct: no word dictionary.
 */
export function pinyinOf(hanzi: string): string {
  const syllables = pinyin(hanzi.replace(/\s+/g, ''), { type: 'array', nonZh: 'consecutive' });
  if (syllables.length === 0) return '';
  if (syllables.length <= 3) return capital(joinSyllables(syllables));
  const words: string[][] = [];
  for (let index = 0; index < syllables.length; index += 2)
    words.push(syllables.slice(index, index + 2));
  if (words.at(-1)!.length === 1) words.at(-2)!.push(...words.pop()!);
  return words.map((word) => capital(joinSyllables(word))).join(' ');
}
