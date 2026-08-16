<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { Badge } from '@gym/shared-ui';

const kiosk = useKioskStore();
let unsub: (() => void) | null = null;

onMounted(() => { unsub = kiosk.subscribe(); });
onBeforeUnmount(() => unsub?.());

function name(id: string) {
  const m = kiosk.membersById.get(id);
  return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
}
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-lg font-bold">Currently Inside</h2>
      <Badge kind="active">{{ kiosk.openVisits.length }}</Badge>
    </div>
    <ul v-if="kiosk.openVisits.length" class="divide-y divide-slate-100">
      <li v-for="v in kiosk.openVisits" :key="v.id" class="flex items-center justify-between py-2">
        <span class="font-medium">{{ name(v.memberId) }}</span>
        <Badge :kind="v.isUnpaid ? 'danger' : 'success'">{{ v.isUnpaid ? 'Needs Renew' : 'OK' }}</Badge>
      </li>
    </ul>
    <p v-else class="py-4 text-center text-slate-400">No members currently inside.</p>
  </div>
</template>
