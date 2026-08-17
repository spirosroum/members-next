import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member } from '../mappers';
import { renameMember } from '../rpc';
import { isConfigured } from '../client';

export interface BinMember {
  id: string;
  firstName: string;
  lastName: string;
  belt: string;
  accountStatus: string;
  deletedAt: string | null;
}

// Admin member CRUD + recycle bin. Member rows are soft-deleted (deleted_at),
// never hard-deleted. Private fields go to member_private (RLS-gated).
const bin = ref<BinMember[]>([]);

export function useMemberAdmin(client: SupabaseClient) {
  async function loadBin() {
    if (!isConfigured()) return;
    try {
      const { data, error } = await client.from('members').select('*').not('deleted_at', 'is', null);
      if (error) throw error;
      bin.value = (data as any[]).map(r => ({
        id: r.id, firstName: r.first_name, lastName: r.last_name, belt: r.belt,
        accountStatus: r.account_status, deletedAt: r.deleted_at
      }));
    } catch (e) {
      console.warn('bin load failed', e);
    }
  }

  // Upsert a member row + its private fields. Return the saved member.
  async function saveMember(m: Member) {
    const { phone, email, dob, notes, ...publicPart } = m;
    const row = {
      id: publicPart.id,
      first_name: publicPart.firstName,
      last_name: publicPart.lastName,
      gender: publicPart.gender ?? null,
      belt: publicPart.belt,
      expiration_date: publicPart.expirationDate ?? null,
      account_status: publicPart.accountStatus,
      sessions_total: !!publicPart.sessionsTotal,
      sessions_left: publicPart.sessionsLeft ?? 0,
      plan_days: publicPart.planDays ?? null,
      hide_from_leaderboard: !!publicPart.hideFromLeaderboard,
      deleted_at: null
    };
    const { error } = await client.from('members').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    // Private fields (admin-only via RLS).
    const hasPrivate = phone !== undefined || email !== undefined || dob !== undefined || notes !== undefined;
    if (hasPrivate) {
      const { error: pErr } = await client.from('member_private').upsert({
        member_id: m.id,
        phone: phone ?? null,
        email: email ?? null,
        dob: dob ?? null,
        notes: notes ?? null
      }, { onConflict: 'member_id' });
      if (pErr) throw pErr;
    }
  }

  async function rename(oldId: string, newId: string) {
    const { error } = await renameMember(client, oldId, newId);
    if (error) throw error;
  }

  async function softDelete(memberId: string) {
    const { error } = await client
      .from('members')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', memberId);
    if (error) throw error;
  }

  async function restore(memberId: string) {
    const { error } = await client.from('members').update({ deleted_at: null }).eq('id', memberId);
    if (error) throw error;
  }

  return { bin, loadBin, saveMember, rename, softDelete, restore };
}
