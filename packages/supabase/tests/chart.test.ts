import { describe, it, expect } from 'vitest';
import {
  getCumulativeTrainingSeries,
  computeOvertakeCrowns,
  computeLeaderCrown
} from '../src/domain/chart';
import type { Member, Visit, ClassCheckin } from '../src/mappers';

function member(id: string): Member {
  return {
    id,
    firstName: id,
    lastName: 'Test',
    gender: null,
    belt: 'White',
    expirationDate: null,
    accountStatus: 'active',
    sessionsTotal: false,
    sessionsLeft: 0,
    planDays: null,
    hideFromLeaderboard: false
  };
}

function checkin(id: string, memberId: string, date: string, classId = 'c1', slot = '10:00'): ClassCheckin {
  return {
    id,
    visitId: `v-${id}`,
    memberId,
    classId,
    slotDate: date,
    slotStart: slot,
    slotEnd: '11:00',
    entryTime: `${date}T10:00:00`
  };
}

function openGym(id: string, memberId: string, date: string): Visit {
  return {
    id,
    memberId,
    entryTime: `${date}T18:00:00`,
    expectedExitTime: null,
    exitTime: null,
    isUnpaid: false,
    paidOverride: null,
    classIds: [],
    department: null
  };
}

const since = new Date('2026-08-01T00:00:00');
const until = new Date('2026-08-31T23:59:59');

describe('getCumulativeTrainingSeries', () => {
  it('dedupes repeated class check-ins on the same session and accumulates per day', () => {
    const series = getCumulativeTrainingSeries(
      [member('a')],
      [
        checkin('1', 'a', '2026-08-10'),
        checkin('2', 'a', '2026-08-10'), // same session, ignored
        checkin('3', 'a', '2026-08-12', 'c2'),
        checkin('4', 'a', '2026-08-12', 'c2', '12:00') // different slot → counts
      ],
      [],
      since,
      until
    );
    expect(series[0].points).toEqual([
      { date: '2026-08-10', count: 1 },
      { date: '2026-08-12', count: 3 }
    ]);
  });

  it('counts open-gym visits (no class check-in) separately', () => {
    const series = getCumulativeTrainingSeries(
      [member('a')],
      [checkin('1', 'a', '2026-08-10')],
      [openGym('og1', 'a', '2026-08-11'), openGym('og2', 'a', '2026-08-11')],
      since,
      until
    );
    expect(series[0].points).toEqual([
      { date: '2026-08-10', count: 1 },
      { date: '2026-08-11', count: 3 }
    ]);
  });

  it('excludes members with no trainings in the window', () => {
    const series = getCumulativeTrainingSeries([member('a'), member('b')], [checkin('1', 'a', '2026-08-10')], [], since, until);
    expect(series.map(s => s.memberId)).toEqual(['a']);
  });
});

describe('computeOvertakeCrowns', () => {
  it('crowns a unique leader who breaks the record, not a tie', () => {
    // A leads at 1; B matches at 1 (no crown); B breaks to 2 (crown).
    const series = getCumulativeTrainingSeries(
      [member('a'), member('b')],
      [
        checkin('1', 'a', '2026-08-10'),
        checkin('2', 'b', '2026-08-11'),
        checkin('3', 'b', '2026-08-12')
      ],
      [],
      since,
      until
    );
    expect(computeOvertakeCrowns(series)).toEqual([{ memberId: 'b', date: '2026-08-12' }]);
  });

  it('does not crown a match (tie) for the top score', () => {
    // A leads at 1 on Aug 18; B matches at 1 on Aug 19 → no crown.
    const series = getCumulativeTrainingSeries(
      [member('a'), member('b')],
      [checkin('1', 'a', '2026-08-18'), checkin('2', 'b', '2026-08-19')],
      [],
      since,
      until
    );
    expect(computeOvertakeCrowns(series)).toEqual([]);
  });

  it('does not crown a first training', () => {
    const series = getCumulativeTrainingSeries([member('a')], [checkin('1', 'a', '2026-08-10')], [], since, until);
    expect(computeOvertakeCrowns(series)).toEqual([]);
  });

  it('does not re-crown a leader extending their own record', () => {
    const series = getCumulativeTrainingSeries(
      [member('a')],
      [checkin('1', 'a', '2026-08-10'), checkin('2', 'a', '2026-08-11')],
      [],
      since,
      until
    );
    expect(computeOvertakeCrowns(series)).toEqual([]);
  });
});

describe('computeLeaderCrown', () => {
  it('returns the unique top member', () => {
    const series = getCumulativeTrainingSeries(
      [member('a'), member('b')],
      [checkin('1', 'a', '2026-08-10'), checkin('2', 'b', '2026-08-10'), checkin('3', 'b', '2026-08-11')],
      [],
      since,
      until
    );
    expect(computeLeaderCrown(series)).toBe('b');
  });

  it('returns null when the top score is tied', () => {
    const series = getCumulativeTrainingSeries(
      [member('a'), member('b')],
      [checkin('1', 'a', '2026-08-10'), checkin('2', 'b', '2026-08-10')],
      [],
      since,
      until
    );
    expect(computeLeaderCrown(series)).toBeNull();
  });
});
