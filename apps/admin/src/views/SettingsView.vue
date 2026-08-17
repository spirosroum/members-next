<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button } from '@gym/shared-ui';

const admin = useAdminStore();

const portalName = ref(admin.settings.portalName);
const currency = ref(admin.settings.currency);
const colors = ref<Record<number, string>>({ ...admin.settings.attendanceColors });
const saved = ref('');

const TIERS = [50, 60, 70, 80, 90, 95, 98];

function flash(msg: string) { saved.value = msg; setTimeout(() => (saved.value = ''), 2000); }

async function savePortal() {
  await admin.savePortalName(portalName.value.trim() || '🥋 SSG BJJ');
  flash('Portal name saved.');
}
async function saveCurr() {
  await admin.saveCurrency(currency.value.trim() || '€');
  flash('Currency saved.');
}
async function saveColors() {
  await admin.saveAttendanceColors({ ...colors.value });
  flash('Attendance colors saved.');
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-4 text-lg font-bold">General Settings</h2>
    <p v-if="saved" class="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{{ saved }}</p>

    <div class="mb-4">
      <label class="text-sm font-semibold text-slate-500">Portal Name</label>
      <div class="mt-1 flex gap-2">
        <input v-model="portalName" class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <Button size="sm" @click="savePortal">Save</Button>
      </div>
    </div>

    <div class="mb-4">
      <label class="text-sm font-semibold text-slate-500">Currency</label>
      <div class="mt-1 flex gap-2">
        <input v-model="currency" class="w-28 rounded-lg border border-slate-300 px-3 py-2" />
        <Button size="sm" @click="saveCurr">Save</Button>
      </div>
    </div>

    <div>
      <label class="text-sm font-semibold text-slate-500">Attendance Feedback Colors</label>
      <p class="text-xs text-slate-400 mb-2">Percentage color per tier (nothing below 50%). The 98%+ tier should be gold.</p>
      <div class="space-y-2">
        <div v-for="t in TIERS" :key="t" class="flex items-center gap-3">
          <span class="w-14 text-sm font-semibold text-slate-500">{{ t }}%+</span>
          <input v-model="colors[t]" type="color" class="h-9 w-14 cursor-pointer rounded border border-slate-300" />
          <input v-model="colors[t]" class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm" placeholder="#RRGGBB" />
        </div>
      </div>
      <Button class="mt-3" size="sm" @click="saveColors">Save Colors</Button>
    </div>
  </div>
</template>
