import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { kioskClient, useMembers, useVisits, useSchedules, useClassCheckins } from '@gym/supabase';
import { checkInMember, type CheckInSelection } from '@gym/supabase';
import { computeVisitUnpaid } from '@gym/supabase';
import type { Member } from '@gym/supabase';

export type KioskState = 'idle' | 'checking' | 'selecting-classes' | 'done' | 'error';

export const useKioskStore = defineStore('kiosk', () => {
  const client = kioskClient();
  const { members, load: loadMembers, byId } = useMembers(client);
  const { visits, openVisits, refresh: refreshVisits, subscribe } = useVisits(client);
  const { schedules, load: loadSchedules } = useSchedules(client);
  const { checkins, refresh: refreshCheckins } = useClassCheckins(client);

  const state = ref<KioskState>('idle');
  const lastError = ref<string | null>(null);
  const lastAlert = ref<string | null>(null);
  const pendingMember = ref<Member | null>(null);
  const pendingMemberUnpaid = ref(false);
  const selectedClassIds = ref<Set<string>>(new Set());

  const memberLookupError = ref<string | null>(null);

  const membersById = computed(() => {
    const m = new Map<string, Member>();
    members.value.forEach(x => m.set(x.id, x));
    return m;
  });

  const isUnpaidVisit = computed(() => pendingMemberUnpaid.value);

  async function boot() {
    try {
      await Promise.all([loadMembers(), loadSchedules()]);
      await refreshVisits();
      await refreshCheckins();
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : 'Kiosk load failed.';
    }
  }

  function lookup(id: string): Member | null {
    memberLookupError.value = null;
    const m = byId(id);
    if (!m) { memberLookupError.value = 'Invalid ID. Member not found.'; return null; }
    if (m.accountStatus === 'frozen') {
      memberLookupError.value = 'Account is Frozen. Please see staff.';
      return null;
    }
    if (m.accountStatus === 'cancelled') {
      memberLookupError.value = 'Account is Cancelled. Please see staff.';
      return null;
    }
    pendingMember.value = m;
    pendingMemberUnpaid.value = computeVisitUnpaid(m);
    selectedClassIds.value = new Set();
    state.value = 'selecting-classes';
    return m;
  }

  function toggleClass(slotId: string) {
    const next = new Set(selectedClassIds.value);
    if (next.has(slotId)) next.delete(slotId);
    else next.add(slotId);
    selectedClassIds.value = next;
  }

  // Today's classes that are public/visible for the kiosk class-selection modal.
  const todayClasses = computed(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayName = dayNames[today.getDay()];
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const entries: { slotId: string; classId: string; name: string; color: string; start: string; end: string; slotDay: string; slotDate: string }[] = [];
    schedules.value.forEach(cls => {
      if (cls.isPublic === false) return;
      (cls.slots || []).forEach(slot => {
        if (slot.day !== todayName) return;
        entries.push({
          slotId: `checkin-slot-${cls.id}-${slot.day}-${slot.start}-${slot.end}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          classId: cls.id,
          name: cls.name,
          color: cls.color || '#2563eb',
          start: slot.start,
          end: slot.end,
          slotDay: slot.day,
          slotDate: todayIso
        });
      });
    });
    return entries.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
  });

  const selectedSelections = computed<CheckInSelection[]>(() =>
    todayClasses.value
      .filter(c => selectedClassIds.value.has(c.slotId))
      .map(c => ({
        classId: c.classId,
        slotDate: c.slotDate,
        slotDay: c.slotDay,
        slotStart: c.start,
        slotEnd: c.end
      }))
  );

  async function submitCheckIn(openGym = false) {
    const member = pendingMember.value;
    if (!member) return;
    const selections = openGym ? [] : selectedSelections.value;
    state.value = 'checking';
    try {
      const { data, error } = await checkInMember(client, member.id, selections, new Date().toISOString());
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.rejected) {
        lastAlert.value = row.reason === 'already_checked_in'
          ? 'You have already checked into this class.'
          : 'Check-in is not allowed for this account.';
        state.value = 'error';
        return;
      }
      lastAlert.value = row?.is_unpaid
        ? 'Attention: Your membership has expired or you are out of sessions. Please see staff.'
        : null;
      await refreshVisits();
      await refreshCheckins();
      pendingMember.value = null;
      selectedClassIds.value = new Set();
      state.value = row?.is_unpaid ? 'done' : 'done';
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : 'Check-in failed. Please try again.';
      state.value = 'error';
    }
  }

  function cancel() {
    pendingMember.value = null;
    selectedClassIds.value = new Set();
    state.value = 'idle';
  }

  function resetAlerts() {
    lastAlert.value = null;
    lastError.value = null;
    memberLookupError.value = null;
    state.value = 'idle';
  }

  return {
    members, membersById, openVisits, visits, schedules, checkins,
    state, lastError, lastAlert, pendingMember, pendingMemberUnpaid,
    selectedClassIds, memberLookupError, todayClasses, selectedSelections,
    isUnpaidVisit,
    boot, lookup, toggleClass, submitCheckIn, cancel, resetAlerts, subscribe
  };
});
