import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Member, Visit, ClassCheckin, Payment, Schedule } from '@gym/supabase';
import {
  kioskClient, useMembers, useVisits, useClassCheckins, useSchedules, usePayments, useMemberAdmin
} from '@gym/supabase';
import { renameMember } from '@gym/supabase';

export const useMemberStore = defineStore('member', () => {
  const client = kioskClient();
  const { members, load, byId } = useMembers(client);
  const { visits, refresh: refreshVisits } = useVisits(client);
  const { checkins, refresh: refreshCheckins } = useClassCheckins(client);
  const { schedules, closedDates, load: loadSchedules } = useSchedules(client);
  const { payments, load: loadPayments } = usePayments(client);
  const memberAdmin = useMemberAdmin(client);

  const sessionId = ref<string | null>(localStorage.getItem('gym_member_session'));
  const loaded = ref(false);

  const current = computed<Member | null>(() => (sessionId.value ? byId(sessionId.value) ?? null : null));

  const myVisits = computed<Visit[]>(() =>
    visits.value.filter(v => v.memberId === sessionId.value)
  );
  const myCheckins = computed<ClassCheckin[]>(() =>
    checkins.value.filter(c => c.memberId === sessionId.value)
  );
  const myPayments = computed<Payment[]>(() =>
    payments.value.filter(p => p.memberId === sessionId.value)
  );
  const mySchedules = computed<Schedule[]>(() => schedules.value);

  async function boot() {
    if (loaded.value) return;
    await Promise.all([load(), loadSchedules(), loadPayments()]);
    await Promise.all([refreshVisits(), refreshCheckins()]);
    loaded.value = true;
  }

  function signIn(id: string) {
    const m = byId(id);
    if (!m) return false;
    sessionId.value = id;
    localStorage.setItem('gym_member_session', id);
    return true;
  }

  function signOut() {
    sessionId.value = null;
    localStorage.removeItem('gym_member_session');
  }

  async function changeId(newId: string) {
    const oldId = sessionId.value;
    if (!oldId || oldId === newId) return;
    await renameMember(client, oldId, newId);
    // Update the local member + cascade references (mirrors server cascade for UI).
    const idx = members.value.findIndex(m => m.id === oldId);
    if (idx !== -1) {
      members.value[idx]!.id = newId;
    }
    visits.value.forEach(v => { if (v.memberId === oldId) v.memberId = newId; });
    checkins.value.forEach(c => { if (c.memberId === oldId) c.memberId = newId; });
    payments.value.forEach(p => { if (p.memberId === oldId) p.memberId = newId; });
    sessionId.value = newId;
    localStorage.setItem('gym_member_session', newId);
  }

  async function toggleHideFromLeaderboard(checked: boolean) {
    const id = sessionId.value;
    if (!id) return;
    const idx = members.value.findIndex(m => m.id === id);
    if (idx === -1) return;
    members.value[idx]!.hideFromLeaderboard = checked;
    // Persist the flag via the public members row (no private data needed).
    const { error } = await client.from('members').update({ hide_from_leaderboard: checked }).eq('id', id);
    if (error) throw error;
  }

  return {
    members, current, visits, myVisits, checkins: myCheckins, schedules: mySchedules,
    closedDates, payments: myPayments, loaded,
    boot, signIn, signOut, changeId, toggleHideFromLeaderboard
  };
});
