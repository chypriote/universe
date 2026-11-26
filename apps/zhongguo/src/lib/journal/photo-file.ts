import ExifReader from 'exifreader';
import type { PhotoTime } from './types';

export type PhotoFile = {
  width: number;
  height: number;
  /** YYYY-MM-DD from the EXIF capture time; null when there is none. */
  exifDate: string | null;
  /** Part of the day from the EXIF capture time; null when there is none. */
  exifTime: PhotoTime | null;
};

/** The part of the day of an hour from 0 to 23. */
export function timeOfHour(hour: number): PhotoTime {
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/** A real calendar date as YYYY-MM-DD, or null. */
function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** Whether the text is a real calendar date as YYYY-MM-DD. */
export function isDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match !== null && isoDate(Number(match[1]), Number(match[2]), Number(match[3])) === text;
}

/**
 * The date in a file name, from the patterns the camera and chat apps write:
 * `2025-03-29-09-02.jpg` (a space before the second dash is allowed), `IMG_20250329_090212.jpg`,
 * `IMG20250329090212.jpg` and `mmexport1743238932000.jpg` (a Unix time in UTC).
 */
export function fileNameDate(name: string): string | null {
  let match = /^(\d{4})-(\d{2})-(\d{2})\s*-\d{2}-\d{2}/.exec(name);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^IMG_?(\d{4})(\d{2})(\d{2})/.exec(name);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^mmexport(\d{10,13})/.exec(name);
  if (match) {
    const raw = Number(match[1]);
    const date = new Date(match[1].length <= 10 ? raw * 1000 : raw);
    return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  return null;
}

/** Size as displayed (EXIF orientation applied) and capture date; null when the file is not a readable image. */
export function readPhotoFile(file: ArrayBuffer): PhotoFile | null {
  let tags: ExifReader.Tags;
  try {
    tags = ExifReader.load(file);
  } catch {
    return null;
  }
  const width = Number(tags['Image Width']?.value);
  const height = Number(tags['Image Height']?.value);
  if (!(width > 0) || !(height > 0)) return null;

  const turned = Number(tags.Orientation?.value) >= 5;
  const taken = /^(\d{4})[:-](\d{2})[:-](\d{2})(?: (\d{2}):)?/.exec(String(tags.DateTimeOriginal?.description ?? ''));
  return {
    width: turned ? height : width,
    height: turned ? width : height,
    exifDate: taken ? isoDate(Number(taken[1]), Number(taken[2]), Number(taken[3])) : null,
    exifTime: taken?.[4] !== undefined && Number(taken[4]) < 24 ? timeOfHour(Number(taken[4])) : null,
  };
}
