import type { Member, Visit, Payment, ClassCheckin } from '../mappers';
import { dateToLocalIso } from '../domain/dates';

// Approximate a member's join date: earliest of first payment, first check-in,
// or first visit. Used by retention KPIs.
export function getMemberJoinDate(
  memberId: string,
  payments: Payment[],
  checkins: ClassCheckin[],
  visits: Visit[]
): Date | null {
  const dates: number[] = [];
  payments.forEach(p => {
    if (p.memberId !== memberId || !p.date) return;
    const d = new Date(p.date + 'T12:00:00');
    if (!isNaN(d.getTime())) dates.push(d.getTime());
  });
  checkins.forEach(ci => {
    if (ci.memberId !== memberId || !ci.entryTime) return;
    const d = new Date(ci.entryTime);
    if (!isNaN(d.getTime())) dates.push(d.getTime());
  });
  visits.forEach(v => {
    if (v.memberId !== memberId || !v.entryTime) return;
    const d = new Date(v.entryTime);
    if (!isNaN(d.getTime())) dates.push(d.getTime());
  });
  if (!dates.length) return null;
  return new Date(Math.min(...dates));
}

export interface DashboardKpis {
  currentlyInside: number;
  todayVisits: number;
  unpaidCheckins: number;
  activeSubscriptions: number;
  totalMembers: number;
  genders: Record<string, number>;
}

export function computeDashboardKpis(
  members: Member[],
  visits: Visit[],
  now: Date
): DashboardKpis {
  const validIds = new Set(members.map(m => m.id));
  const today = dateToLocalIso(now);
  const currentlyInside = visits.filter(v =>
    v.exitTime === null && v.expectedExitTime && new Date(v.expectedExitTime) > now && validIds.has(v.memberId)
  ).length;
  const todayVisits = visits.filter(v =>
    v.entryTime && dateToLocalIso(new Date(v.entryTime)) === today && validIds.has(v.memberId)
  ).length;
  const activeSubscriptions = members.filter(m =>
    (m.accountStatus === 'active') && (!m.expirationDate || new Date(m.expirationDate + 'T23:59:59') >= now)
  ).length;
  const unpaidCheckins = visits.filter(v => v.isUnpaid && validIds.has(v.memberId)).length;
  const genders: Record<string, number> = {};
  members.forEach(m => {
    const g = m.gender || 'Unspecified';
    genders[g] = (genders[g] || 0) + 1;
  });
  return { currentlyInside, todayVisits, unpaidCheckins, activeSubscriptions, totalMembers: members.length, genders };
}
