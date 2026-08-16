import { defineStore } from 'pinia';
import { ref } from 'vue';
import { adminClientInstance } from '@gym/supabase';
import { useMembers } from '@gym/supabase';
import { usePayments } from '@gym/supabase';

export const useAdminStore = defineStore('admin', () => {
  const authed = ref(false);

  const membersApi = useMembers(adminClientInstance());
  const paymentsApi = usePayments(adminClientInstance());

  async function signIn(email: string, password: string) {
    const auth = adminClientInstance().auth;
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) throw error;
    authed.value = true;
    await Promise.all([membersApi.load(), paymentsApi.load()]);
  }

  async function signOut() {
    await adminClientInstance().auth.signOut();
    authed.value = false;
  }

  return { authed, members: membersApi.members, payments: paymentsApi.payments, signIn, signOut };
});
