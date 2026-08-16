import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassCheckinRow } from '../types';
import type { ClassCheckin } from '../mappers';
import { isConfigured } from '../client';

const checkins = ref<ClassCheckin[]>([]);

export function useClassCheckins(client: SupabaseClient) {
  async function refresh() {
    if (!isConfigured()) return;
    try {
      const { data, error } = await client.from('class_checkins').select('*');
      if (error) return;
      checkins.value = (data as ClassCheckinRow[]).map(r => ({
        id: r.id,
        visitId: r.visit_id,
        memberId: r.member_id,
        classId: r.class_id,
        slotDate: r.slot_date,
        slotStart: r.slot_start,
        slotEnd: r.slot_end,
        entryTime: r.entry_time
      }));
    } catch (e) {
      console.warn('class checkins refresh failed', e);
    }
  }

  return { checkins, refresh };
}
