import { describe, it, expect } from 'vitest';
import {
  computeVisitUnpaid,
  reconcileMemberPaymentVisitStatus,
  computeMemberFirstUnpaidDay
} from '../src/domain/reconcile';
import type { Member, Payment, Visit, Plan } from '../src/mappers';

function member(over: Partial<Member>): Member {
  return {
    id: '1',
    firstName: 'A',
    lastName: 'B',
    gender: null,
    belt: 'White',
    expirationDate: null,
    accountStatus: 'active',
    sessionsTotal: false,
    sessionsLeft: 0,
    planDays: null,
    hideFromLeaderboard: false,
    ...over
  };
}

function visit(id: string, entryTime: string, isUnpaid = false): Visit {
  return { id, memberId: '1', entryTime, expectedExitTime: null, exitTime: null, isUnpaid, paidOverride: null, classIds: [] };
}

function payment(over: Partial<Payment>): Payment {
  return {
    id: 'P1',
    memberId: '1',
    date: '2026-08-01',
    amount: 50,
    note: null,
    planId: null,
    sessionsGranted: null,
    appliedExpiration: null,
    appliedStartDate: null,
    prevExpiration: null,
    clearedVisitIds: [],
    ...over
  };
}

describe('computeVisitUnpaid', () => {
  it('is unpaid for inactive/frozen/cancelled members', () => {
    expect(computeVisitUnpaid(member({ accountStatus: 'inactive' }))).toBe(true);
    expect(computeVisitUnpaid(member({ accountStatus: 'frozen' }))).toBe(true);
    expect(computeVisitUnpaid(member({ accountStatus: 'cancelled' }))).toBe(true);
  });

  it('is unpaid for an expired time-based member with no sessions', () => {
    const m = member({ expirationDate: '2026-07-01', planDays: 30, sessionsTotal: false, sessionsLeft: 0 });
    expect(computeVisitUnpaid(m)).toBe(true);
  });

  it('is paid for an active time-based member with unexpired coverage', () => {
    const future = new Date(Date.now() + 10 * 86400000);
    const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    const m = member({ expirationDate: iso, planDays: 30 });
    expect(computeVisitUnpaid(m)).toBe(false);
  });

  it('is paid when sessions remain', () => {
    expect(computeVisitUnpaid(member({ sessionsTotal: true, sessionsLeft: 3 }))).toBe(false);
    expect(computeVisitUnpaid(member({ sessionsTotal: true, sessionsLeft: 0 }))).toBe(true);
  });
});

describe('reconcileMemberPaymentVisitStatus', () => {
  it('a session payment consumes unpaid visits chronologically and recomputes the balance', () => {
    const m = member({ sessionsTotal: true, sessionsLeft: 8 });
    const pays = [payment({ id: 'A', sessionsGranted: 8, date: '2026-08-01' })];
    const visits = [
      visit('V1', '2026-08-02T10:00:00+03:00'),
      visit('V2', '2026-08-03T10:00:00+03:00')
    ];
    const res = reconcileMemberPaymentVisitStatus(m, pays, visits, []);
    expect(res.visits.get('V1')).toBe(false); // paid
    expect(res.visits.get('V2')).toBe(false); // paid
    expect(res.member?.sessionsLeft).toBe(6); // 8 - 2 consumed
  });

  it('deleting a payment re-marks its covered visits unpaid', () => {
    const m = member({});
    const visits = [visit('V1', '2026-08-10T10:00:00+03:00')];
    // No payments at all → no coverage → unpaid.
    const res = reconcileMemberPaymentVisitStatus(m, [], visits, []);
    expect(res.visits.get('V1')).toBe(true);
  });

  it('a time payment covers visits within its Athens-day window only', () => {
    const m = member({});
    const pays = [
      payment({ id: 'T', appliedExpiration: '2026-08-31', appliedStartDate: '2026-08-01', sessionsGranted: null })
    ];
    // 10:00 local Athens on the last covered day must be inside the window.
    const inside = visit('V1', '2026-08-31T10:00:00+03:00');
    // The day AFTER the window (already expired) must be unpaid.
    const outside = visit('V2', '2026-09-01T10:00:00+03:00');
    const res = reconcileMemberPaymentVisitStatus(m, pays, [inside, outside], []);
    expect(res.visits.get('V1')).toBe(false);
    expect(res.visits.get('V2')).toBe(true);
  });

  it('an active member with no usable coverage converges to inactive', () => {
    const m = member({ accountStatus: 'active', expirationDate: null, sessionsTotal: false, sessionsLeft: 0 });
    const res = reconcileMemberPaymentVisitStatus(m, [], [], []);
    expect(res.member?.accountStatus).toBe('inactive');
  });
});

describe('computeMemberFirstUnpaidDay', () => {
  it('returns the first visit not covered by anything', () => {
    const m = member({});
    const pays: Payment[] = [];
    const visits = [
      visit('V1', '2026-08-02T10:00:00+03:00'),
      visit('V2', '2026-08-03T10:00:00+03:00')
    ];
    const first = computeMemberFirstUnpaidDay(m, pays, visits);
    expect(first).not.toBeNull();
    expect(new Date(first!).toISOString()).toBe(new Date('2026-08-02T10:00:00+03:00').toISOString());
  });
});
