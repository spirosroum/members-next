<script setup lang="ts">
import { useMemberStore } from '../stores/session';
import { Button } from '@gym/shared-ui';
import { ref } from 'vue';

const session = useMemberStore();
const id = ref('');
const error = ref<string | null>(null);

function submit() {
  error.value = null;
  if (!session.signIn(id.value.trim())) error.value = 'Member ID not found.';
  id.value = '';
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-1 text-xl font-bold">Member Login</h2>
    <p class="mb-4 text-sm text-slate-500">Enter your member ID to see your dashboard.</p>
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <input
        v-model="id"
        inputmode="numeric"
        maxlength="8"
        placeholder="Member ID"
        class="rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <Button type="submit" :block="true">Sign In</Button>
      <p v-if="error" class="text-center text-sm font-semibold text-rose-600">{{ error }}</p>
    </form>
  </div>
</template>
