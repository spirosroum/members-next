<script setup lang="ts">
import { computed } from 'vue';
import { useKioskStore } from '../stores/kiosk';

const kiosk = useKioskStore();

const todayClasses = computed(() => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = dayNames[new Date().getDay()];
  const out: { name: string; color: string; start: string; end: string }[] = [];
  kiosk.schedules.forEach(cls => {
    if (cls.isPublic === false) return;
    (cls.slots || []).forEach(slot => {
      if (slot.day === day) out.push({ name: cls.name, color: cls.color || '#2563eb', start: slot.start, end: slot.end });
    });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start));
});
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h2 class="mb-2 text-lg font-bold">Training Schedule</h2>
    <div v-if="todayClasses.length" class="space-y-2">
      <div
        v-for="(c, i) in todayClasses"
        :key="i"
        class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
      >
        <span class="font-medium" :style="{ borderLeft: `4px solid ${c.color}`, paddingLeft: '0.5rem' }">{{ c.name }}</span>
        <span class="text-sm text-slate-500">{{ c.start.slice(0, 5) }} – {{ c.end.slice(0, 5) }}</span>
      </div>
    </div>
    <p v-else class="py-3 text-center text-sm text-slate-400">No classes scheduled today.</p>
  </div>
</template>
