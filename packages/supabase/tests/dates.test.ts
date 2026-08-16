import { describe, it, expect } from 'vitest';
import { calculateExpirationDate, getDaysRemaining, buildClosedSet } from '../src/domain/dates';

describe('dates', () => {
  it('getDaysRemaining returns -1 for no expiration', () => {
    expect(getDaysRemaining(null)).toBe(-1);
    expect(getDaysRemaining(undefined)).toBe(-1);
  });

  it('getDaysRemaining counts down to end-of-day local', () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(getDaysRemaining(iso)).toBe(0);
  });

  it('calculateExpirationDate counts only open days (skips closed dates)', () => {
    const start = '2026-08-10'; // Monday
    const closed = [
      { date: '2026-08-12', repeat: false }, // Wednesday closed
      { date: '2026-08-13', dateEnd: '2026-08-14', repeat: false } // Thu+Fri closed
    ];
    // 10 open days starting Mon Aug 10:
    // Week1: Mon10, Tue11, (Wed12/Thu13/Fri14 closed), Sat15, Sun16 → 4 open
    // Week2: Mon17, Tue18, Wed19, Thu20, Fri21, Sat22 → 6 more = 10 → exp = 2026-08-22
    expect(calculateExpirationDate(start, 10, closed)).toBe('2026-08-22');
  });

  it('buildClosedSet marks a multi-day range and repeats across years', () => {
    const set = buildClosedSet([{ date: '2026-12-31', dateEnd: '2027-01-01', repeat: true }], 2028);
    expect(set.has('2026-12-31')).toBe(true);
    expect(set.has('2027-01-01')).toBe(true);
    expect(set.has('2027-12-31')).toBe(true);
    expect(set.has('2028-01-01')).toBe(true);
  });
});
