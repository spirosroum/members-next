// Typed RPC payloads — the server-side "rules". Keep in sync with the
// SECURITY DEFINER functions in supabase/migrations/*.sql.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CheckInSelection {
  classId: string;
  slotDate: string;
  slotDay: string;
  slotStart: string;
  slotEnd: string;
}

export interface CheckInResult {
  visit_id: string;
  is_unpaid: boolean;
  sessions_left: number;
  rejected: boolean;
  reason: string | null;
}

export interface ApplyPaymentInput {
  id?: string;
  memberId: string;
  date: string;
  amount: number;
  note?: string | null;
  planId?: string | null;
  sessionsGranted?: number | null;
  appliedExpiration?: string | null;
  appliedStartDate?: string | null;
  prevExpiration?: string | null;
}

export function checkInMember(
  client: SupabaseClient,
  memberId: string,
  selections: CheckInSelection[],
  entryTime: string,
  backdated = false
) {
  return client
    .rpc('check_in_member', {
      p_member_id: memberId,
      p_class_selections: selections,
      p_entry_time: entryTime,
      p_backdated: backdated
    })
    .returns<CheckInResult>();
}

export function applyPayment(client: SupabaseClient, payment: ApplyPaymentInput) {
  return client.rpc('apply_payment', { p_payment: payment });
}

export function deletePayment(client: SupabaseClient, memberId: string, paymentId: string) {
  return client.rpc('delete_payment', { p_member_id: memberId, p_payment_id: paymentId });
}

export function renameMember(client: SupabaseClient, oldId: string, newId: string) {
  return client.rpc('rename_member', { p_old_id: oldId, p_new_id: newId });
}

export function createNotification(
  client: SupabaseClient,
  title: string,
  message: string,
  type: string,
  memberId?: string
) {
  return client.rpc('create_notification', {
    p_title: title,
    p_msg: message,
    p_type: type,
    p_member_id: memberId ?? null
  });
}
