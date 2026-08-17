<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Modal, Button } from '@gym/shared-ui';
import type { CheckInSelection } from '@gym/supabase';

const admin = useAdminStore();
const isOpen = computed(() => !!admin.pendingCheckin);
const selectedIds = ref<Set<string>>(new Set());
const dateIso = ref(todayIso());
const error = ref<string | null>(null);
const busy = ref(false);

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

watch(isOpen, open => {
  if (open) { selectedIds.value = new Set(); dateIso.value = todayIso(); error.value = null; }
});

const isBackdated = computed(() => dateIso.value !== todayIso());

const todayClasses = computed(() => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[new Date(dateIso.value + 'T12:00:00').getDay()];
  const entries: { slotId: string; classId: string; name: string; color: string; start: string; end: string; day: string }[] = [];
  admin.schedules.forEach(cls => {
    if (cls.isPublic === false) return;
    (cls.slots || []).forEach(slot => {
      if (slot.day === dayName) {
        entries.push({
          slotId: `checkin-slot-${cls.id}-${slot.day}-${slot.start}-${slot.end}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          classId: cls.id, name: cls.name, color: cls.color || '#2563eb', start: slot.start, end: slot.end, day: slot.day
        });
      }
    });
  });
  return entries.sort((a, b) => a.start.localeCompare(b.start));
});

function toggle(slotId: string) {
  const next = new Set(selectedIds.value);
  if (next.has(slotId)) next.delete(slotId); else next.add(slotId);
  selectedIds.value = next;
}

function buildEntryIso(): string {
  // If a class is selected, anchor the entry time to its slot (so backdated
  // visits fall on the right day); otherwise use local noon on the chosen date.
  const first = todayClasses.value.find(c => selectedIds.value.has(c.slotId));
  const base = dateIso.value + (first ? `T${first.start}:00` : 'T12:00:00');
  return new Date(base).toISOString();
}

async function submit(openGym = false) {
  const member = admin.pendingCheckin;
  if (!member) return;
  busy.value = true;
  error.value = null;
  try {
    const selections: CheckInSelection[] = openGym ? [] : todayClasses.value
      .filter(c => selectedIds.value.has(c.slotId))
      .map(c => ({ classId: c.classId, slotDate: dateIso.value, slotDay: c.day, slotStart: c.start, slotEnd: c.end }));
    const row = await admin.confirmCheckin(member, selections, buildEntryIso());
    if (row?.rejected) {
      error.value = row.reason === 'already_checked_in' ? 'Already checked into this class.' : 'Check-in not allowed for this account.';
      return;
    }
    admin.pendingCheckin = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Check-in failed.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Modal :open="isOpen" @close="admin.pendingCheckin = null">
    <h2 class="mb-1 text-xl font-bold">Check in {{ admin.pendingCheckin?.firstName }} {{ admin.pendingCheckin?.lastName }}</h2>
    <p v-if="isBackdated" class="mb-3 text-sm font-semibold text-amber-600">Recording a past session ({{ dateIso }})</p>

    <div class="mb-3">
      <label class="text-sm font-semibold text-slate-500">Training Date</label>
      <input v-model="dateIso" type="date" :max="todayIso()" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
    </div>

    <div v-if="todayClasses.length" class="max-h-56 space-y-2 overflow-y-auto">
      <button
        v-for="c in todayClasses" :key="c.slotId" type="button"
        class="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition"
        :class="selectedIds.has(c.slotId) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'"
        @click="toggle(c.slotId)"
      >
        <span class="font-semibold" :style="{ borderLeft: `4px solid ${c.color}`, paddingLeft: '0.5rem' }">{{ c.name }}</span>
        <span class="text-sm text-slate-500">{{ c.start.slice(0, 5) }} – {{ c.end.slice(0, 5) }}</span>
      </button>
    </div>
    <p v-else class="py-3 text-center text-sm text-slate-400">No classes on this date. You can still record an open-gym check-in.</p>

    <p v-if="error" class="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{{ error }}</p>

    <div class="mt-4 flex gap-2">
      <Button variant="outline" class="flex-1" @click="admin.pendingCheckin = null">Cancel</Button>
      <Button class="flex-1" :disabled="busy" @click="submit(false)">{{ busy ? 'Checking in…' : 'Confirm Check-In' }}</Button>
    </div>
    <Button variant="ghost" class="mt-2 w-full" :disabled="busy" @click="submit(true)">Open Gym (No Class)</Button>
  </Modal>
</template>
