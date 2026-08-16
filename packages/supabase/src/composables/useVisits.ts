import { ref, watch } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VisitRow } from '../types';
import { visitFromRow, type Visit } from '../mappers';
import { checkInMember, type CheckInSelection } from '../rpc';
import { isConfigured } from '../client';

const visits = ref<Visit[]>([]);

export function useVisits(client: SupabaseClient) {
  const configured = isConfigured();
  // Realtime: keep the "currently inside" list live.
  function subscribe() {
    if (!configured) return () => {};
    const channel = client
      .channel('visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => refresh()
      )
      .subscribe();
    return () => client.removeChannel(channel);
  }

  async function refresh() {
    if (!configured) return;
    try {
      const { data, error } = await client.from('visits').select('*');
      if (error) return;
      visits.value = (data as VisitRow[]).map(visitFromRow);
    } catch (e) {
      // Backend unreachable (e.g. local dev without env vars): leave the cache as-is.
      console.warn('visits refresh failed', e);
    }
  }

  const openVisits = ref<Visit[]>([]);
  watch(visits, list => {
    const now = new Date();
    openVisits.value = list.filter(
      v => v.exitTime === null && v.expectedExitTime && new Date(v.expectedExitTime) > now
    );
  });

  async function checkIn(memberId: string, selections: CheckInSelection[], entryTime: string) {
    const { data, error } = await checkInMember(client, memberId, selections, entryTime);
    if (error) throw error;
    await refresh();
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    return rows[0] ?? null;
  }

  return { visits, openVisits, refresh, subscribe, checkIn };
}
