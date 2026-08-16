import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberRow } from '../types';
import { memberFromRow, type Member } from '../mappers';
import { isConfigured } from '../client';

// Shared reactive cache so kiosk + member + admin can all subscribe to the
// same member list without duplicate fetches.
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

  function byId(id: string) {
    return members.value.find(m => m.id === id);
  }

  return { members, loaded, load, byId };
}
