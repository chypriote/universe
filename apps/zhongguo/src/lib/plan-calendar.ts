import { formatDate, formatMonth } from '@universe/universe/format';
import { getPlaceName } from '@/lib/place-names';

export type PlanDay = {
  day: number;
  city: string;
};

export type CityCalendarCell = {
  date: string;
  day: number;
  city: string;
  cityZh: string;
  cityPinyin: string;
};

export type CalendarMonth = {
  key: string;
  label: string;
  weekdayOffset: number;
  daysInMonth: number;
  cells: Map<number, CityCalendarCell>;
};

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

export function getDayDate(startDate: string, dayNumber: number): string {
  const { year, month, day } = parseIsoDate(startDate);
  const date = new Date(year, month - 1, day + dayNumber - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} — ${formatDate(endDate)}`;
}

export function buildCityCalendarDays(days: PlanDay[], startDate: string): CityCalendarCell[] {
  return [...days]
    .sort((a, b) => a.day - b.day)
    .map((planDay) => {
      const place = getPlaceName(planDay.city);
      return {
        date: getDayDate(startDate, planDay.day),
        day: planDay.day,
        city: planDay.city,
        cityZh: place.zh,
        cityPinyin: place.pinyin,
      };
    });
}

export function buildCalendarMonths(cells: CityCalendarCell[]): CalendarMonth[] {
  if (cells.length === 0) {
    return [];
  }

  const byMonth = new Map<string, CalendarMonth>();

  for (const cell of cells) {
    const { year, month, day } = parseIsoDate(cell.date);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    let calendarMonth = byMonth.get(key);

    if (!calendarMonth) {
      const firstOfMonth = new Date(year, month - 1, 1);
      calendarMonth = {
        key,
        label: formatMonth(key),
        weekdayOffset: firstOfMonth.getDay(),
        daysInMonth: new Date(year, month, 0).getDate(),
        cells: new Map(),
      };
      byMonth.set(key, calendarMonth);
    }

    calendarMonth.cells.set(day, cell);
  }

  return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}
