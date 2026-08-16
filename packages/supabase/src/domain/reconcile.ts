// Coverage & reconciliation logic — ported from the production app's
// computeVisitUnpaid / computeMemberFirstUnpaidDay / reconcileMemberPaymentVisitStatus.
// Pure functions: they take data and return changes; persistence is the caller's job.
import type { Member, Payment, Plan, Visit } from '../mappers';
import { getDaysRemaining, dayStart, dayEnd } from './dates';

// Whether a member's next visit would be unpaid. Mirrors the client check that
// drives the kiosk/staff unpaid flag BEFORE the server RPC runs.
export function computeVisitUnpaid(member: Member | null | undefined): boolean {
  if (!member) return true;
  if (member.accountStatus === 'frozen') return true;
  if (member.accountStatus === 'cancelled') return true;
  if (member.accountStatus === 'inactive') return true;
  const planDays = member.planDays != null ? parseInt(String(member.planDays), 10) : null;
  if (planDays && member.expirationDate && getDaysRemaining(member.expirationDate) >= 0) return false;
  if (member.sessionsTotal) return (parseInt(String(member.sessionsLeft), 10) || 0) <= 0;
  if (planDays) return true;
  if (member.expirationDate && getDaysRemaining(member.expirationDate) >= 0) return false;
  return true;
}

// A payment covers visits within its applied [start, expiration] window. A
// session-granting payment never creates a time window (quota-based instead).
export function paymentTimeWindow(p: Payment): { start: Date; end: Date } | null {
  if (!p.appliedExpiration) return null;
  if (p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0) return null;
  const start = dayStart(p.appliedStartDate || p.date);
  const end = dayEnd(p.appliedExpiration);
  if (!start || !end) return null;
  return { start, end };
}

// The first unpaid day: first visit (chronological) not covered by explicit
// clearance, a payment window, or drop-in session quota. The membership window
// starts here. Returns null when every visit is covered.
export function computeMemberFirstUnpaidDay(
  member: Member | null | undefined,
  payments: Payment[],
  visits: Visit[]
): Date | null {
  const explicitIds = new Set<string>();
  payments.forEach(p => {
    if (Array.isArray(p.clearedVisitIds)) {
      const grantsSessions = p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0;
      if (grantsSessions) return;
      p.clearedVisitIds.forEach(id => explicitIds.add(id));
    }
  });
  const timeWindows = payments
    .map(paymentTimeWindow)
    .filter((w): w is { start: Date; end: Date } => !!w);
  const capacity = payments.reduce(
    (s, p) => s + (p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0 ? parseInt(String(p.sessionsGranted), 10) : 0),
    0
  );
  const fallbackLimit = member && member.sessionsTotal ? (parseInt(String(member.sessionsLeft), 10) || 0) : 0;
  let used = 0;
  const sorted = [...visits].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
  for (const v of sorted) {
    const entry = v.entryTime ? new Date(v.entryTime) : null;
    if (!entry || isNaN(entry.getTime())) continue;
    if (explicitIds.has(v.id)) continue;
    if (timeWindows.some(w => entry >= w.start && entry <= w.end)) continue;
    const limit = capacity > 0 ? capacity : fallbackLimit;
    if (used < limit) { used++; continue; }
    return entry;
  }
  return null;
}

export interface ReconcileResult {
  visits: Map<string, boolean>; // visitId -> isUnpaid
  member: {
    sessionsTotal?: boolean;
    sessionsLeft?: number;
    planDays?: number;
    accountStatus?: Member['accountStatus'];
  } | null;
}

// Re-evaluates every visit for a member against the remaining payment ledger,
// and derives the member's session balance / planDays / account status. The
// production app runs the same logic client-side; the server RPC recompute_member
// is the authoritative copy — this stays for offline/local derivation and tests.
export function reconcileMemberPaymentVisitStatus(
  member: Member | null | undefined,
  payments: Payment[],
  visits: Visit[],
  plans: Plan[]
): ReconcileResult {
  const memberVisits = visits
    .filter(v => v.memberId === member?.id)
    .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());

  // Step 1: explicitly cleared visit ids (session-granting payments excluded).
  const explicitPaidVisitIds = new Set<string>();
  payments.forEach(p => {
    if (Array.isArray(p.clearedVisitIds)) {
      const grantsSessions = p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0;
      if (grantsSessions) return;
      p.clearedVisitIds.forEach(id => explicitPaidVisitIds.add(id));
    }
  });

  // Step 2: time coverage windows + member membership window.
  const timeWindows = payments
    .map(paymentTimeWindow)
    .filter((w): w is { start: Date; end: Date } => !!w);
  const isTimeCoveredMember = member && (!member.sessionsTotal || member.planDays != null);
  const memberExpires = member?.expirationDate ? dayEnd(member.expirationDate) : null;
  const memberWindowActive = !!isTimeCoveredMember && !!memberExpires
    && getDaysRemaining(member.expirationDate) >= 0;
  const memberWindowStart = memberWindowActive
    ? computeMemberFirstUnpaidDay(member, payments, memberVisits)
    : null;

  // Step 3: total session quota granted by session payments.
  const totalSessionsCapacity = payments.reduce(
    (s, p) => s + (p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0 ? parseInt(String(p.sessionsGranted), 10) : 0),
    0
  );

  // Step 4: re-evaluate visits chronologically.
  let sessionsUsed = 0;
  const visitFlags = new Map<string, boolean>();
  memberVisits.forEach(v => {
    const entry = v.entryTime ? new Date(v.entryTime) : null;
    let shouldBePaid = false;
    if (v.paidOverride === 'paid') {
      shouldBePaid = true;
    } else if (v.paidOverride === 'unpaid') {
      shouldBePaid = false;
    } else if (explicitPaidVisitIds.has(v.id) || (entry && timeWindows.some(w => entry >= w.start && entry <= w.end))) {
      shouldBePaid = true;
    } else if (totalSessionsCapacity > 0) {
      if (sessionsUsed < totalSessionsCapacity) { shouldBePaid = true; sessionsUsed++; }
    } else if (member && member.sessionsTotal && (parseInt(String(member.sessionsLeft), 10) || 0) > 0) {
      if (sessionsUsed < (parseInt(String(member.sessionsLeft), 10) || 0)) { shouldBePaid = true; sessionsUsed++; }
    }
    if (v.paidOverride !== 'unpaid' && !shouldBePaid && memberWindowStart && entry && memberExpires
      && !isNaN(entry.getTime()) && entry >= memberWindowStart && entry <= memberExpires) {
      shouldBePaid = true;
    }
    visitFlags.set(v.id, !shouldBePaid);
  });

  const memberPatch: ReconcileResult['member'] = {};
  if (member && totalSessionsCapacity > 0) {
    const recomputedLeft = Math.max(0, totalSessionsCapacity - sessionsUsed);
    memberPatch.sessionsTotal = true;
    memberPatch.sessionsLeft = recomputedLeft;
  }
  if (member && member.planDays == null) {
    const timePays = payments
      .filter(p => p.appliedExpiration && !(p.sessionsGranted && parseInt(String(p.sessionsGranted), 10) > 0))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = timePays[0];
    if (latest) {
      const plan = latest.planId ? plans.find(pl => pl.id === latest.planId) : null;
      let days: number | null = plan && plan.days != null ? parseInt(String(plan.days), 10) : null;
      if (days == null) {
        const s = latest.appliedStartDate ? dayStart(latest.appliedStartDate) : null;
        const e = latest.appliedExpiration ? dayEnd(latest.appliedExpiration) : null;
        if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime())) days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
      }
      if (days != null) memberPatch.planDays = days;
    }
  }
  if (member && member.accountStatus === 'active') {
    const hasUsableCoverage =
      (member.sessionsTotal && (parseInt(String(member.sessionsLeft), 10) || 0) > 0)
      || (member.expirationDate && getDaysRemaining(member.expirationDate) >= 0);
    if (!hasUsableCoverage) memberPatch.accountStatus = 'inactive';
  }

  return { visits: visitFlags, member: member ? memberPatch : null };
}
