import { defineStore } from 'pinia';
import { ref } from 'vue';
import { adminClientInstance, useMembers, usePayments, useVisits, useSchedules, useSettings, useMemberAdmin } from '@gym/supabase';
import { checkInMember, type CheckInSelection } from '@gym/supabase';
import { getDaysRemaining, computeVisitUnpaid } from '@gym/supabase';
import type { Member } from '@gym/supabase';

export type AdminStatus = 'frozen' | 'cancelled' | 'inactive' | 'expired' | 'no-sessions' | 'active';

export const useAdminStore = defineStore('admin', () => {
  const authed = ref(false);
  const client = adminClientInstance();

  const membersApi = useMembers(client);
  const paymentsApi = usePayments(client);
  const visitsApi = useVisits(client);
  const schedulesApi = useSchedules(client);
  const settingsApi = useSettings(client);
  const memberAdminApi = useMemberAdmin(client);

  const pendingCheckin = ref<Member | null>(null);
  const pendingBackdated = ref(false);

  async function signIn(email: string, password: string) {
    const auth = client.auth;
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) throw error;
    authed.value = true;
    await Promise.all([
      membersApi.load(),
      membersApi.loadPrivate(),
      paymentsApi.load(),
      visitsApi.refresh(),
      schedulesApi.load(),
      settingsApi.load(),
      memberAdminApi.loadBin()
    ]);
  }

  async function signOut() {
    await client.auth.signOut();
    authed.value = false;
  }

  // Membership state for the search result card, mirroring the production app.
  function memberStatus(m: Member): AdminStatus {
    if (m.accountStatus === 'frozen') return 'frozen';
    if (m.accountStatus === 'cancelled') return 'cancelled';
    if (m.accountStatus === 'inactive') return 'inactive';
    if (m.expirationDate && getDaysRemaining(m.expirationDate) < 0) return 'expired';
    if (m.sessionsTotal && (parseInt(String(m.sessionsLeft), 10) || 0) <= 0) return 'no-sessions';
    return 'active';
  }

  function isUnpaid(m: Member): boolean {
    return computeVisitUnpaid(m);
  }

  function startCheckin(member: Member, backdated: boolean) {
    pendingCheckin.value = member;
    pendingBackdated.value = backdated;
  }

  async function confirmCheckin(member: Member, selections: CheckInSelection[], entryTime: string) {
    const { data, error } = await checkInMember(client, member.id, selections, entryTime, pendingBackdated.value);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    await visitsApi.refresh();
    return row;
  }

  async function checkout(visitId: string) {
    const { error } = await client
      .from('visits')
      .update({ exit_time: new Date().toISOString() })
      .eq('id', visitId);
    if (error) throw error;
    await visitsApi.refresh();
  }

  return {
    authed, pendingCheckin, pendingBackdated,
    members: membersApi.members, payments: paymentsApi.payments, plans: paymentsApi.plans,
    openVisits: visitsApi.openVisits, schedules: schedulesApi.schedules, closedDates: schedulesApi.closedDates,
    notice: settingsApi.notice, bin: memberAdminApi.bin,
    signIn, signOut, memberStatus, isUnpaid, startCheckin, confirmCheckin, checkout,
    saveCheckinNotice: settingsApi.saveCheckinNotice,
    savePayment: paymentsApi.save, deletePayment: paymentsApi.remove,
    savePlan: paymentsApi.savePlan, deletePlan: paymentsApi.deletePlan,
    saveClosedDate: schedulesApi.saveClosedDate, deleteClosedDate: schedulesApi.deleteClosedDate,
    loadBin: memberAdminApi.loadBin,
    saveMember: memberAdminApi.saveMember,
    renameMember: memberAdminApi.rename,
    softDeleteMember: memberAdminApi.softDelete,
    restoreMember: memberAdminApi.restore
  };
});
