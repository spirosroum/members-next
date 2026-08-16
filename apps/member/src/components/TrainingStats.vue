<script setup lang="ts">
import { computed } from 'vue';
import type { Member } from '@gym/supabase';
import { useVisits, useClassCheckins, kioskClient } from '@gym/supabase';
import { ProgressBar } from '@gym/shared-ui';

const props = defineProps<{ member: Member }>();
const { visits } = useVisits(kioskClient());
const { checkins } = useClassCheckins(kioskClient());

const myVisits = computed(() => visits.value.filter(v => v.memberId === props.member.id));
const total = computed(() => myVisits.value.length);
const totalHours = computed(() =>
  myVisits.value.reduce((s, v) => {
    if (!v.exitTime) return s;
    return s + Math.max(0, (new Date(v.exitTime).getTime() - new Date(v.entryTime).getTime()) / 3_600_000);
  }, 0)
);

// Attendance % over the last 90 days per public class the member attends.
const perClass = computed(() => {
  const map = new Map<string, { name: string; attended: number; available: number }>();
  // Placeholder: compute from checkins + schedule in utils.ts. This shows the shape.
  return [...map.values()];
});
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-3 text-lg font-bold">Training Stats</h2>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Trainings</div>
        <div class="mt-1 text-2xl font-extrabold">{{ total }}</div>
      </div>
      <div class="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Hours Trained</div>
        <div class="mt-1 text-2xl font-extrabold">{{ totalHours.toFixed(1) }}h</div>
      </div>
    </div>

    <h3 class="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Attendance (last 90 days)</h3>
    <div v-if="perClass.length">
      <div v-for="c in perClass" :key="c.name" class="mb-2 flex items-center gap-3">
        <span class="w-1/3 text-sm font-medium">{{ c.name }}</span>
        <ProgressBar class="flex-1" :value="(c.attended / c.available) * 100" />
        <span class="w-12 text-right text-sm font-bold">{{ Math.round((c.attended / c.available) * 100) }}%</span>
      </div>
    </div>
    <p v-else class="text-sm text-slate-400">No class sessions in this period.</p>
  </section>
</template>
