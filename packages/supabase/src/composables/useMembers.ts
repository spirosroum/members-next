import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberRow, MemberPrivateRow } from '../types';
import { memberFromRow, type Member } from '../mappers';
import { isConfigured } from '../client';

// Shared reactive cache so kiosk + member + admin can all subscribe to the
// same member list without duplicate fetches. Private fields (phone/email/...)
// are only merged when `loadPrivate` is explicitly called by an admin client —
// RLS would return nothing for anon/kiosk anyway, so this is defense in depth.
const members = ref<Member[]>([]);
const loaded = ref(false);

export function useMembers(client: SupabaseClient) {
  async function load() {
    if (!isConfigured()) { loaded.value = true; return; }
    try {
      const { data, error } = await client
        .from('members')
        .select('*')
        .is('deleted_at', null);
      if (error) throw error;
      members.value = (data as MemberRow[]).map(r => memberFromRow(r));
      loaded.value = true;
    } catch (e) {
      console.warn('members load failed', e);
      loaded.value = true;
    }
  }

  // Merge admin-only private fields (phone/email/dob/notes). RLS protects this
  // server-side; the caller must be an admin client.
  async function loadPrivate() {
    if (!isConfigured()) return;
    try {
      const { data, error } = await client.from('member_private').select('*');
      if (error) throw error;
      const map = new Map<string, MemberPrivateRow>((data as MemberPrivateRow[]).map(r => [r.member_id, r]));
      members.value = members.value.map(m => {
        const p = map.get(m.id);
        if (!p) return m;
        return { ...m, phone: p.phone ?? undefined, email: p.email ?? undefined, dob: p.dob ?? undefined, notes: p.notes ?? undefined };
      });
    } catch (e) {
      console.warn('member_private load failed (non-admin client?)', e);
    }
  }

  function byId(id: string) {
    return members.value.find(m => m.id === id);
  }

  return { members, loaded, load, loadPrivate, byId };
}
