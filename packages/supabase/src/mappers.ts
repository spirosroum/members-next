import type {
  MemberRow,
  VisitRow,
  PaymentRow,
  PlanRow,
  ClassCheckinRow,
  ScheduleRow
} from './types';

// camelCase domain types used by the UI layer. `MEMBER_PRIVATE_FIELDS`
// (phone/dob/notes/email) are merged in only for admin sessions — never for
// kiosk/member clients. RLS enforces the same boundary server-side.
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  belt: string;
  expirationDate: string | null;
  accountStatus: MemberRow['account_status'];
  sessionsTotal: boolean;
  sessionsLeft: number;
  planDays: number | null;
  hideFromLeaderboard: boolean;
  phone?: string;
  email?: string;
  dob?: string;
  notes?: string;
}

export interface Visit {
  id: string;
  memberId: string;
  entryTime: string;
  expectedExitTime: string | null;
  exitTime: string | null;
  isUnpaid: boolean;
  paidOverride: VisitRow['paid_override'];
  classIds: string[];
}

export interface Payment {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  note: string | null;
  planId: string | null;
  sessionsGranted: number | null;
  appliedExpiration: string | null;
  appliedStartDate: string | null;
  prevExpiration: string | null;
  clearedVisitIds: string[];
}

export interface Plan {
  id: string;
  name: string;
  days: number | null;
  sessions: number | null;
  price: number;
  color: string;
  isPublic: boolean;
  isTrial: boolean;
}

export interface ClassCheckin {
  id: string;
  visitId: string;
  memberId: string;
  classId: string;
  slotDate: string | null;
  slotStart: string | null;
  slotEnd: string | null;
  entryTime: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  description: string | null;
  color: string;
  capacity: number | null;
  isPublic: boolean;
  availableFrom: string | null;
  slots: { day: string; start: string; end: string }[];
}

export function memberFromRow(r: MemberRow, privateData?: Partial<Member>): Member {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    gender: r.gender,
    belt: r.belt,
    expirationDate: r.expiration_date,
    accountStatus: r.account_status,
    sessionsTotal: r.sessions_total,
    sessionsLeft: r.sessions_left,
    planDays: r.plan_days,
    hideFromLeaderboard: r.hide_from_leaderboard,
    ...privateData
  };
}

export function visitFromRow(r: VisitRow): Visit {
  return {
    id: r.id,
    memberId: r.member_id,
    entryTime: r.entry_time,
    expectedExitTime: r.expected_exit_time,
    exitTime: r.exit_time,
    isUnpaid: r.is_unpaid,
    paidOverride: r.paid_override,
    classIds: r.class_ids
  };
}

export function paymentFromRow(r: PaymentRow): Payment {
  return {
    id: r.id,
    memberId: r.member_id,
    date: r.date,
    amount: r.amount,
    note: r.note,
    planId: r.plan_id,
    sessionsGranted: r.sessions_granted,
    appliedExpiration: r.applied_expiration,
    appliedStartDate: r.applied_start_date,
    prevExpiration: r.prev_expiration,
    clearedVisitIds: r.cleared_visit_ids
  };
}
