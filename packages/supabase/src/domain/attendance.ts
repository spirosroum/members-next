// Attendance % and training-count logic — ported from the production app's
// buildAvailableTrainings / getMemberAttendance / getMemberTrainingCount.
import type { ClassCheckin, Schedule } from '../mappers';
import { buildClosedSet, dateToLocalIso, dayStart, dayEnd, todayLocalIso } from './dates';

export interface AvailableTraining {
  date: string; // YYYY-MM-DD
  classId: string;
  className: string;
  slotStart: string | null;
  slotEnd: string | null;
}

// All class sessions that were actually available in [since, until]: not on
// closed dates, not in the future, and only for classes whose available_from
// had passed.
export function buildAvailableTrainings(
  since: Date,
  until: Date,
  schedules: Schedule[],
  closedDates: { date: string; dateEnd?: string; repeat?: boolean }[]
): AvailableTraining[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const closedSet = buildClosedSet(closedDates, until.getFullYear() + 1);
  const today = todayLocalIso();
  const sessions: AvailableTraining[] = [];
  const cursor = new Date(since);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setHours(23, 59, 59, 999);
  while (cursor <= end) {
    const dayIso = dateToLocalIso(cursor);
    if (dayIso > today) break;
    if (!closedSet.has(dayIso)) {
      const dayName = dayNames[cursor.getDay()];
      schedules.forEach(cls => {
        if (cls.availableFrom && cls.availableFrom > dayIso) return;
        (cls.slots || []).forEach(slot => {
          if (slot.day === dayName) {
            sessions.push({ date: dayIso, classId: cls.id, className: cls.name, slotStart: slot.start, slotEnd: slot.end });
          }
        });
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

export interface PerClassAttendance {
  classId: string;
  name: string;
  available: number;
  attended: number;
  pct: number | null;
}

export interface AttendanceResult {
  attended: number;
  available: number;
  pct: number | null;
  perClass: PerClassAttendance[];
}

// Attendance % for a member over [since, until]. With onlyPublicOrAttended,
// the overall % is computed only over classes that are public or that the
// member attended in the lookback window.
export function getMemberAttendance(
  memberId: string,
  since: Date,
  until: Date,
  schedules: Schedule[],
  checkins: ClassCheckin[],
  closedDates: { date: string; dateEnd?: string; repeat?: boolean }[],
  opts: { onlyPublicOrAttended?: boolean; lookbackDays?: number; skipEffectiveStart?: boolean } = {}
): AttendanceResult {
  let effectiveSince = since;
  if (opts.skipEffectiveStart !== true) {
    const first = checkins
      .filter(ci => ci.memberId === memberId && ci.entryTime)
      .map(ci => new Date(ci.entryTime!))
      .filter(d => !isNaN(d.getTime()) && d >= since && d < until)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (first) {
      const firstDay = new Date(first);
      firstDay.setHours(0, 0, 0, 0);
      if (firstDay > since) effectiveSince = firstDay;
    }
  }

  const availableCount = new Map<string, number>();
  const meta = new Map<string, { name: string; available: number }>();
  buildAvailableTrainings(effectiveSince, until, schedules, closedDates).forEach(s => {
    const key = `${s.date}|${s.classId}`;
    availableCount.set(key, (availableCount.get(key) || 0) + 1);
    const m = meta.get(s.classId) || { name: s.className, available: 0 };
    m.available++;
    meta.set(s.classId, m);
  });

  const attendedCount = new Map<string, number>();
  checkins.forEach(ci => {
    if (ci.memberId !== memberId || !ci.entryTime) return;
    const d = new Date(ci.entryTime);
    if (isNaN(d.getTime())) return;
    if (since && d < since) return;
    if (until && d >= until) return;
    const dateKey = ci.slotDate || dateToLocalIso(d);
    const key = `${dateKey}|${ci.classId}`;
    attendedCount.set(key, (attendedCount.get(key) || 0) + 1);
  });

  let totalAvailable = 0;
  let totalMatched = 0;
  availableCount.forEach((count, key) => {
    totalAvailable += count;
    totalMatched += Math.min(attendedCount.get(key) || 0, count);
  });

  let perClass: PerClassAttendance[] = [...meta.entries()].map(([classId, cls]) => {
    let att = 0;
    availableCount.forEach((count, key) => {
      if (key.split('|')[1] === classId) att += Math.min(attendedCount.get(key) || 0, count);
    });
    return {
      classId,
      name: cls.name,
      available: cls.available,
      attended: att,
      pct: cls.available > 0 ? Math.round((att / cls.available) * 100) : null
    };
  });
  perClass.sort((a, b) => (b.pct || 0) - (a.pct || 0) || a.name.localeCompare(b.name));

  if (opts.onlyPublicOrAttended) {
    const lookback = opts.lookbackDays || 90;
    const sinceLookback = new Date(until.getTime() - lookback * 24 * 3600 * 1000);
    const attendedIds = new Set<string>();
    checkins.forEach(ci => {
      if (ci.memberId !== memberId || !ci.entryTime) return;
      const d = new Date(ci.entryTime);
      if (isNaN(d.getTime()) || d < sinceLookback || d >= until) return;
      attendedIds.add(ci.classId);
    });
    const publicIds = new Set(schedules.filter(s => s.isPublic !== false).map(s => s.id));
    perClass = perClass.filter(c => publicIds.has(c.classId) || attendedIds.has(c.classId));
    const shownAvailable = perClass.reduce((s, c) => s + c.available, 0);
    const shownAttended = perClass.reduce((s, c) => s + c.attended, 0);
    return {
      attended: shownAttended,
      available: shownAvailable,
      pct: shownAvailable > 0 ? Math.round((shownAttended / shownAvailable) * 100) : null,
      perClass
    };
  }

  const pct = totalAvailable > 0 ? Math.round((totalMatched / totalAvailable) * 100) : null;
  return { attended: totalMatched, available: totalAvailable, pct, perClass };
}

// Distinct trainings: one per unique (date, class, time-slot) check-in. Falls
// back to raw visit count when no class-level check-ins exist (legacy data).
export function getMemberTrainingCount(
  memberId: string,
  checkins: ClassCheckin[],
  visitEntries: Array<string | null | undefined>,
  sinceDate: Date | null = null,
  untilDate: Date | null = null
): number {
  let filtered = checkins.filter(ci => ci.memberId === memberId && ci.entryTime);
  if (sinceDate) filtered = filtered.filter(ci => new Date(ci.entryTime!) >= sinceDate);
  if (untilDate) filtered = filtered.filter(ci => new Date(ci.entryTime!) < untilDate);

  const unique = new Set<string>();
  filtered.forEach(ci => {
    const dateKey = ci.slotDate || (ci.entryTime ? dateToLocalIso(new Date(ci.entryTime)) : '');
    const sessionKey = `${dateKey}|${ci.classId}|${ci.slotStart || ''}|${ci.slotEnd || ''}`;
    unique.add(sessionKey);
  });

  if (unique.size > 0) return unique.size;
  return visitEntries.filter(ts => {
    if (!ts) return false;
    const d = new Date(ts);
    return !isNaN(d.getTime()) && (!sinceDate || d >= sinceDate) && (!untilDate || d < untilDate);
  }).length;
}

// Attendance tier color. Below 50% returns null (no color → default text).
export function attendanceColor(
  p: number | null,
  colors: Record<number, string>
): string | null {
  if (p == null || p < 50) return null;
  if (p >= 98) return colors[98] ?? null;
  if (p >= 95) return colors[95] ?? null;
  if (p >= 90) return colors[90] ?? null;
  if (p >= 80) return colors[80] ?? null;
  if (p >= 70) return colors[70] ?? null;
  if (p >= 60) return colors[60] ?? null;
  return colors[50] ?? null;
}
