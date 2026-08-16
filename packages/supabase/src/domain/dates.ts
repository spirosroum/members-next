// Date/calendar helpers. All dates are handled as local calendar dates
// (Greece, UTC+2/+3) — never .toISOString() day math, which shifts days for
// positive-offset timezones.

export function dateToLocalIso(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayLocalIso(): string {
  return dateToLocalIso(new Date());
}

// Days remaining until a YYYY-MM-DD expiration (end-of-day local). -1 if absent.
export function getDaysRemaining(expDateStr: string | null | undefined): number {
  if (!expDateStr) return -1;
  const expDate = new Date(expDateStr + 'T23:59:59');
  const now = new Date();
  return Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Parse a date-only string (YYYY-MM-DD) as the local start/end of that day.
export function dayStart(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function dayEnd(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T23:59:59.999');
  return isNaN(d.getTime()) ? null : d;
}

export interface ClosedDate {
  date: string;
  dateEnd?: string;
  repeat?: boolean;
}

// Set of "YYYY-MM-DD" keys that are closed (holidays) within the given years.
export function buildClosedSet(closedDates: ClosedDate[], forYear?: number): Set<string> {
  const closed = new Set<string>();
  closedDates.forEach(c => {
    const startStr = c.date;
    const endStr = c.dateEnd || c.date;
    const repeat = !!c.repeat;

    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    if (!sy || !sm || !sd || !ey || !em || !ed) return;

    const maxYear = (repeat && forYear) ? Math.max(forYear, sy) : sy;
    for (let yr = sy; yr <= maxYear; yr++) {
      const yearOffset = yr - sy;
      const cur = new Date(Date.UTC(sy + yearOffset, sm - 1, sd));
      const end = new Date(Date.UTC(ey + yearOffset, em - 1, ed));
      while (cur <= end) {
        const iso = cur.toISOString().split('T')[0];
        if (iso) closed.add(iso);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
  });
  return closed;
}

// Expiration date = start + N training days, skipping closed dates (holidays
// don't count against the membership). Returns YYYY-MM-DD.
export function calculateExpirationDate(
  startDateStr: string,
  durationDays: number,
  closedDates: ClosedDate[]
): string {
  if (!startDateStr || !durationDays) return '';
  const current = new Date(startDateStr);
  let daysLeft = parseInt(String(durationDays), 10);
  let count = 0;
  let ymd = dateToLocalIso(current);
  const closedSet = buildClosedSet(closedDates, new Date(startDateStr).getUTCFullYear() + 5);

  if (!closedSet.has(ymd)) count++;
  while (count < daysLeft) {
    current.setDate(current.getDate() + 1);
    ymd = dateToLocalIso(current);
    if (!closedSet.has(ymd)) count++;
  }
  return ymd;
}

// Distinct local calendar days in a set of timestamps (2 trainings in one day = 1).
export function distinctLocalDays(timestamps: Array<string | null | undefined>): number {
  const daySet = new Set<string>();
  timestamps.forEach(ts => {
    if (!ts) return;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return;
    daySet.add(dateToLocalIso(d));
  });
  return daySet.size;
}
