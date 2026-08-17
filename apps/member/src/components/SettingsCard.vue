<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMemberStore } from '../stores/session';
import { Button, Toggle } from '@gym/shared-ui';

const session = useMemberStore();
const newId = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

watch(() => session.current?.id, () => { newId.value = ''; });

async function saveId() {
  const id = newId.value.trim();
  if (!id || !/^\d{1,8}$/.test(id)) { error.value = 'Enter a valid numeric ID (up to 8 digits).'; return; }
  if (id === session.current?.id) { error.value = 'This is already your ID.'; return; }
  busy.value = true;
  error.value = null;
  try {
    await session.changeId(id);
    newId.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'ID update failed.';
  } finally {
    busy.value = false;
  }
}

async function toggleHide(v: boolean) {
  try { await session.toggleHideFromLeaderboard(v); } catch (e) { console.warn(e); }
}
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-3 text-lg font-bold">Settings</h2>

    <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div>
        <div class="font-semibold">Hide From Leaderboard</div>
        <p class="text-sm text-slate-400">Keep your name and rank off the public Training Leaderboard.</p>
      </div>
      <Toggle :model-value="!!session.current?.hideFromLeaderboard" @update:model-value="toggleHide" />
    </div>

    <div class="pt-3">
      <div class="font-semibold">Change Member ID</div>
      <p class="text-sm text-slate-400">Your ID is what you use to check in.</p>
      <div class="mt-2 flex gap-2">
        <input v-model="newId" maxlength="8" placeholder="New ID (max 8 digits)" class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <Button :disabled="busy" @click="saveId">{{ busy ? 'Saving…' : 'Save ID' }}</Button>
      </div>
      <p v-if="error" class="mt-2 text-sm font-semibold text-rose-600">{{ error }}</p>
    </div>
  </section>
</template>
