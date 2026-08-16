<script setup lang="ts">
import { ref } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import { Button } from '@gym/shared-ui';

const kiosk = useKioskStore();
const id = ref('');

function press(val: string) {
  if (val === 'clear') id.value = '';
  else if (val === 'back') id.value = id.value.slice(0, -1);
  else if (id.value.length < 8) id.value += val;
}

function submit() {
  const trimmed = id.value.trim();
  if (!trimmed) return;
  id.value = '';
  kiosk.lookup(trimmed);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-1 text-center text-xl font-bold">Member Check-In</h2>
    <p class="mb-4 text-center text-sm text-slate-500">Enter your member ID to check in</p>

    <input
      :value="id"
      inputmode="numeric"
      maxlength="8"
      placeholder="Member ID"
      class="mx-auto block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
      @input="id = ($event.target as HTMLInputElement).value.replace(/\D/g, '')"
      @keyup.enter="submit"
    />

    <div class="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2">
      <template v-for="n in 9" :key="n">
        <button class="rounded-lg bg-slate-100 py-3 text-xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95" @click="press(String(n))">{{ n }}</button>
      </template>
      <button class="rounded-lg bg-rose-100 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-200 active:scale-95" @click="press('clear')">Clear</button>
      <button class="rounded-lg bg-slate-100 py-3 text-xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95" @click="press('0')">0</button>
      <button class="rounded-lg bg-slate-100 py-3 text-xl font-bold text-slate-700 transition hover:bg-slate-200 active:scale-95" @click="press('back')">⌫</button>
    </div>

    <Button class="mt-4 w-full" size="lg" @click="submit">Check In</Button>

    <p v-if="kiosk.memberLookupError" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700">
      {{ kiosk.memberLookupError }}
    </p>
  </div>
</template>
