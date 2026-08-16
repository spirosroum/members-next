// Database row types — mirror `supabase/migrations/*.sql`. These are the
// snake_case rows as Postgres returns them; the UI layer maps to camelCase
// domain types (`Member`, `Visit`, etc.) via the `mappers` module.

export type AccountStatus = 'active' | 'frozen' | 'cancelled' | 'inactive';

export interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  belt: string;
  expiration_date: string | null; // YYYY-MM-DD
  account_status: AccountStatus;
  sessions_total: boolean;
  sessions_left: number;
  plan_days: number | null;
  hide_from_leaderboard: boolean;
  trial_participant: boolean;
  trial_converted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberPrivateRow {
  member_id: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  notes: string | null;
}

export interface VisitRow {
  id: string;
  member_id: string;
  entry_time: string; // ISO timestamptz
  expected_exit_time: string | null;
  exit_time: string | null;
  is_unpaid: boolean;
  paid_override: 'paid' | 'unpaid' | null;
  class_ids: string[];
}

export interface ClassCheckinRow {
  id: string;
  visit_id: string;
  member_id: string;
  class_id: string;
  slot_date: string | null;
  slot_day: string | null;
  slot_start: string | null;
  slot_end: string | null;
  entry_time: string | null;
}

export interface PaymentRow {
  id: string;
  member_id: string;
  date: string;
  amount: number;
  note: string | null;
  plan_id: string | null;
  sessions_granted: number | null;
  applied_expiration: string | null;
  applied_start_date: string | null;
  prev_expiration: string | null;
  cleared_visit_ids: string[];
}

export interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  description_html: boolean;
  days: number | null;
  sessions: number | null;
  price: number;
  color: string;
  is_public: boolean;
  is_trial: boolean;
  deleted_at: string | null;
}

export interface ScheduleRow {
  id: string;
  name: string;
  description: string | null;
  description_html: boolean;
  practitioners: string | null;
  requirements: string | null;
  color: string;
  capacity: number | null;
  is_public: boolean;
  available_from: string | null;
  deleted_at: string | null;
}

export interface ScheduleSlotRow {
  id: string;
  schedule_id: string;
  day: string;
  start: string;
  end: string;
}

export interface ClosedDateRow {
  id: string;
  date: string;
  date_end: string | null;
  repeat: boolean;
  reason: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  member_id: string | null;
  read: boolean;
  created_at: string;
}

export interface SettingsRow {
  key: string;
  value: unknown;
}

export interface BinRow extends MemberRow {
  deleted_at: string;
}

export interface ProfileRow {
  id: string;
  role: string;
}
