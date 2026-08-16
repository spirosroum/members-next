import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Member } from '@gym/supabase';
import { useMembers, kioskClient } from '@gym/supabase';

export const useMemberStore = defineStore('member', () => {
  const { members, load, byId } = useMembers(kioskClient());
  const sessionId = ref<string | null>(localStorage.getItem('gym_member_session'));

  const current = computed<Member | null>(() => (sessionId.value ? byId(sessionId.value) ?? null : null));

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

  return { members, current, load, byId, signIn, signOut };
});
