// Cumulative training-series logic for the kiosk "Training Progress" chart.
// Ported from the production app, with the crown rule tightened: a crown is
// only earned by *breaking* the record (unique leader, strictly ahead), never
// by merely matching it.
import type { Member, Visit, ClassCheckin } from '../mappers';
import { dateToLocalIso } from './dates';

export interface CumulativePoint {
  date: string; // YYYY-MM-DD
  count: number; // cumulative trainings up to and including this date
}

export interface MemberSeries {
  memberId: string;
  points: CumulativePoint[]; // sorted by date
}

// One point per unique class check-in (date/class/slot) plus one per open-gym
// visit (a visit with no class check-in) — the same rule as
// getMemberTrainingCount, but accumulated per day.
export function getCumulativeTrainingSeries(
  members: Member[],
  checkins: ClassCheckin[],
  visits: Visit[],
  since: Date,
  until: Date
): MemberSeries[] {
  const checkinVisitIds = new Set(checkins.map(c => c.visitId));
  const series: MemberSeries[] = [];

  members.forEach(member => {
    const dayCount = new Map<string, number>();
    const seen = new Set<string>();

    checkins.forEach(ci => {
      if (ci.memberId !== member.id || !ci.entryTime) return;
      const d = new Date(ci.entryTime);
      if (isNaN(d.getTime()) || d < since || d >= until) return;
      const dateKey = ci.slotDate || dateToLocalIso(d);
      const sessionKey = `${dateKey}|${ci.classId}|${ci.slotStart || ''}|${ci.slotEnd || ''}`;
      if (seen.has(sessionKey)) return;
      seen.add(sessionKey);
      dayCount.set(dateKey, (dayCount.get(dateKey) || 0) + 1);
    });

    visits.forEach(v => {
      if (v.memberId !== member.id || !v.entryTime || checkinVisitIds.has(v.id)) return;
      const d = new Date(v.entryTime);
      if (isNaN(d.getTime()) || d < since || d >= until) return;
      const dateKey = dateToLocalIso(d);
      dayCount.set(dateKey, (dayCount.get(dateKey) || 0) + 1);
    });

    const dates = [...dayCount.keys()].sort();
    if (!dates.length) return;
    let cum = 0;
    const points = dates.map(date => {
      cum += dayCount.get(date) || 0;
      return { date, count: cum };
    });
    series.push({ memberId: member.id, points });
  });

  return series;
}

export interface OvertakeEvent {
  memberId: string;
  date: string; // the date the record was broken
}

// Cumulative count for a member on a given date, or null before their first
// training. Points are assumed sorted by date.
function countOnOrBefore(points: CumulativePoint[], date: string): number | null {
  let result: number | null = null;
  for (const p of points) {
    if (p.date <= date) result = p.count;
    else break;
  }
  return result;
}

// Crowns for overtaking the leader. A crown is awarded only when a member who
// is already active (has trained before in the period) becomes the *unique*
// leader and strictly beats the previous record. Ties (matching) award nothing,
// and a member's very first training is marked by a baseline point instead.
export function computeOvertakeCrowns(series: MemberSeries[]): OvertakeEvent[] {
  const allDates = new Set<string>();
  series.forEach(s => s.points.forEach(p => allDates.add(p.date)));
  const dates = [...allDates].sort();

  const crowns: OvertakeEvent[] = [];
  let prevActive = new Set<string>();
  let prevLeader: string | null = null;
  let prevLeaderCount = 0;

  dates.forEach(date => {
    let maxCount = 0;
    let leaders = new Set<string>();
    const active = new Set<string>();
    series.forEach(s => {
      const c = countOnOrBefore(s.points, date);
      if (c == null) return;
      active.add(s.memberId);
      if (c > maxCount) {
        maxCount = c;
        leaders = new Set([s.memberId]);
      } else if (c === maxCount) {
        leaders.add(s.memberId);
      }
    });

    // A crown is only awarded to a *unique* leader who overtakes the previous
    // holder by *breaking* the record. Ties leave the crown vacant; a member's
    // first training never earns a crown (it gets a baseline point instead).
    if (leaders.size === 1) {
      const leader = [...leaders][0]!;
      const tookCrown =
        prevActive.has(leader) &&
        (prevLeader == null || (leader !== prevLeader && maxCount > prevLeaderCount));
      if (tookCrown) crowns.push({ memberId: leader, date });
      prevLeader = leader;
      prevLeaderCount = maxCount;
    } else {
      prevLeader = null;
      prevLeaderCount = maxCount;
    }

    prevActive = active;
  });

  return crowns;
}

// The member who currently holds the crown (unique top score). Null when there
// is no data or when the top score is tied.
export function computeLeaderCrown(series: MemberSeries[]): string | null {
  const finals = series
    .filter(s => s.points.length)
    .map(s => ({ memberId: s.memberId, count: s.points[s.points.length - 1]!.count }))
    .sort((a, b) => b.count - a.count);
  if (!finals.length) return null;
  const top = finals[0]!;
  const second = finals.length > 1 ? finals[1]! : null;
  if (second && second.count === top.count) return null;
  return top.memberId;
}
