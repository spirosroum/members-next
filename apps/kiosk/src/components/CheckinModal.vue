<script setup lang="ts">
import { computed } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { Modal, Button } from '@gym/shared-ui';

const kiosk = useKioskStore();
const isOpen = computed(() => kiosk.state === 'selecting-classes' || kiosk.state === 'checking');
</script>

<template>
  <Modal :open="isOpen" @close="kiosk.cancel()">
    <h2 class="mb-1 text-xl font-bold">Select Classes</h2>
    <p v-if="kiosk.pendingMember" class="mb-3 text-sm text-slate-500">
      {{ kiosk.pendingMember.firstName }} {{ kiosk.pendingMember.lastName }}
      <span v-if="kiosk.isUnpaidVisit" class="ml-1 font-semibold text-rose-600">· Needs Renew</span>
    </p>

    <div v-if="kiosk.todayClasses.length" class="max-h-64 space-y-2 overflow-y-auto">
      <button
        v-for="c in kiosk.todayClasses"
        :key="c.slotId"
        type="button"
        class="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition"
        :class="kiosk.selectedClassIds.has(c.slotId) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'"
        @click="kiosk.toggleClass(c.slotId)"
      >
        <span class="font-semibold" :style="{ borderLeft: `4px solid ${c.color}` }" style="padding-left: 0.5rem;">{{ c.name }}</span>
        <span class="text-sm text-slate-500">{{ c.start.slice(0, 5) }} – {{ c.end.slice(0, 5) }}</span>
      </button>
    </div>
    <p v-else class="py-3 text-center text-sm text-slate-400">No classes are scheduled today. You can still check in.</p>

    <div class="mt-4 flex gap-2">
      <Button variant="outline" class="flex-1" @click="kiosk.cancel()">Cancel</Button>
      <Button variant="primary" class="flex-1" :disabled="kiosk.state === 'checking'" @click="kiosk.submitCheckIn(false)">
        {{ kiosk.state === 'checking' ? 'Checking in…' : 'Confirm Check-In' }}
      </Button>
    </div>
    <Button variant="ghost" class="mt-2 w-full" @click="kiosk.submitCheckIn(true)">Check In Without a Class (Open Gym)</Button>
  </Modal>
</template>
