import { Settings, Holiday } from '../database/models.js';

export async function getWeekendDays(): Promise<string[]> {
  try {
    const row = (await Settings.findOne({ id: 1 }).lean()) as any;
    if (row && row.weekend_days) {
      if (Array.isArray(row.weekend_days)) return row.weekend_days;
      if (typeof row.weekend_days === 'string') return JSON.parse(row.weekend_days);
    }
  } catch (err) {
    // fallback
  }
  return ['Saturday', 'Sunday'];
}

export async function getHolidays(): Promise<Set<string>> {
  const holidays = new Set<string>();
  try {
    const rows = await Holiday.find({}, { date: 1 }).lean();
    for (const r of rows) {
      if (r.date) holidays.add(r.date);
    }
  } catch (err) {
    // ignore
  }
  return holidays;
}

export function isWorkingDay(dateStr: string, weekendDays: string[], holidays: Set<string>): boolean {
  if (holidays.has(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[d.getDay()];
  if (weekendDays.includes(dayName)) return false;
  return true;
}

export async function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string
): Promise<{ workingDays: number; dates: string[] }> {
  const [weekendDays, holidays] = await Promise.all([getWeekendDays(), getHolidays()]);

  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (start > end) {
    return { workingDays: 0, dates: [] };
  }

  let count = 0;
  const dates: string[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    if (isWorkingDay(isoDate, weekendDays, holidays)) {
      count++;
      dates.push(isoDate);
    }

    cur.setDate(cur.getDate() + 1);
  }

  return { workingDays: count, dates };
}

export async function getMonthWorkingDays(
  yearMonth: string
): Promise<{ totalWorkingDays: number; dates: string[] }> {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startDate = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const { workingDays, dates } = await calculateWorkingDays(startDate, endDate);
  return { totalWorkingDays: workingDays, dates };
}
