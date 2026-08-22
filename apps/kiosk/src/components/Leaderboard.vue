<script setup lang="ts">
import { computed } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { getMemberTrainingCount } from '@gym/supabase';

const kiosk = useKioskStore();

const standings = computed(() => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return kiosk.members
    .filter(m => !m.hideFromLeaderboard)
    .map(m => ({
      member: m,
      count: getMemberTrainingCount(m.id, kiosk.checkins, kiosk.visits.map(v => v.entryTime), threeMonthsAgo, null)
    }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count || a.member.lastName.localeCompare(b.member.lastName));
});

// The crown is held by a *unique* leader only — a tied top score leaves it vacant.
const leaderId = computed(() => {
  if (standings.value.length < 2) return standings.value[0]?.member.id ?? null;
  const first = standings.value[0]!;
  const second = standings.value[1]!;
  return first.count > second.count ? first.member.id : null;
});
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h2 class="mb-2 text-lg font-bold">Training Leaderboard</h2>
    <ol v-if="standings.length" class="space-y-1">
      <li v-for="(e, i) in standings.slice(0, 10)" :key="e.member.id" class="flex items-center justify-between py-1">
        <span class="font-medium"><span class="mr-2 inline-block w-6 text-center font-bold text-slate-400">{{ i + 1 }}</span>{{ e.member.firstName }} {{ e.member.lastName }}<span v-if="e.member.id === leaderId" class="ml-1">👑</span></span>
        <span class="text-sm font-bold text-emerald-600">{{ e.count }}</span>
      </li>
    </ol>
    <p v-else class="py-3 text-center text-sm text-slate-400">No standings yet.</p>
  </div>
</template>
