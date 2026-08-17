<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button } from '@gym/shared-ui';

const admin = useAdminStore();
const msg = ref(admin.settings.checkinNotice);
const color = ref(admin.settings.checkinNoticeColor);
const saved = ref(false);

function save() {
  admin.saveCheckinNotice(msg.value.trim(), color.value).then(() => { saved.value = true; setTimeout(() => (saved.value = false), 2000); });
}
function clear() {
  msg.value = '';
  admin.saveCheckinNotice('', color.value);
}
</script>

<template>
  <div class="rounded-xl bg-white p-4 shadow">
    <h2 class="mb-2 text-lg font-bold">Broadcast Notice</h2>
    <div class="flex flex-wrap items-center gap-2">
      <input v-model="msg" placeholder="Notice shown on the kiosk…" class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
      <input v-model="color" type="color" class="h-10 w-14 cursor-pointer rounded border border-slate-300" />
      <Button size="sm" @click="save">{{ saved ? 'Saved ✓' : 'Save' }}</Button>
      <Button v-if="msg" variant="outline" size="sm" @click="clear">Clear</Button>
    </div>
  </div>
</template>
