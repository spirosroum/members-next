<script setup lang="ts">
import { computed } from 'vue';
import { useMemberStore } from '../stores/session';
import { Badge } from '@gym/shared-ui';

const session = useMemberStore();

const history = computed(() =>
  [...session.myVisits].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()).slice(0, 30)
);

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-3 text-lg font-bold">Check-in History</h2>
    <div v-if="history.length" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-400">
            <th class="pb-2">Date</th><th class="pb-2">Entry</th><th class="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in history" :key="v.id" class="border-b">
            <td class="py-2">{{ fmtDate(v.entryTime) }}</td>
            <td class="py-2">{{ fmtTime(v.entryTime) }}</td>
            <td class="py-2"><Badge :kind="v.isUnpaid ? 'danger' : 'success'">{{ v.isUnpaid ? 'Unpaid' : 'Paid' }}</Badge></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="py-3 text-center text-sm text-slate-400">No check-in history yet.</p>
  </section>
</template>
