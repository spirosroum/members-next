<script setup lang="ts">
import { computed } from 'vue';
import { ProgressBar } from '@gym/shared-ui';
import { useMemberStore } from '../stores/session';
import { daysRemaining, sessionTone, sessionsGrantedTotal } from '../composables/memberInfo';

const session = useMemberStore();
const member = computed(() => session.current);

const days = computed(() => daysRemaining(member.value?.expirationDate ?? null));
const showBanner = computed(() => days.value !== null && days.value >= 0 && days.value <= 7);
const expText = computed(() => {
  const m = member.value;
  if (!m) return '';
  if (!m.expirationDate) return m.sessionsTotal ? '—' : 'N/A';
  if (days.value === null) return m.expirationDate;
  return `${m.expirationDate} (${days.value} days left)`;
});

const sLeft = computed(() => member.value?.sessionsLeft ?? 0);
const sTotal = computed(() => sessionsGrantedTotal(member.value, session.payments));
</script>

<template>
  <section v-if="member" class="rounded-xl bg-white p-6 shadow">
    <div v-if="showBanner" class="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
      ⏳ Your membership expires in <strong>{{ days }}</strong> days ({{ member.expirationDate }}).
    </div>

    <h2 class="mb-3 text-lg font-bold">Member Info</h2>
    <dl class="space-y-2 text-[1.05rem]">
      <div class="flex gap-2"><dt class="font-semibold">Current Belt:</dt><dd>{{ member.belt }}</dd></div>
      <div class="flex gap-2"><dt class="font-semibold">Member ID:</dt><dd class="text-slate-500">{{ member.id }}</dd></div>
      <div class="flex gap-2"><dt class="font-semibold">Account Status:</dt><dd>{{ member.accountStatus }}</dd></div>
      <div class="flex gap-2"><dt class="font-semibold">Expiration Date:</dt><dd>{{ expText }}</dd></div>
    </dl>

    <div v-if="member.sessionsTotal" class="mt-4">
      <div class="mb-1 flex justify-between text-sm">
        <span class="font-semibold">Sessions Left</span>
        <span class="text-slate-500">{{ sLeft }}<template v-if="sTotal"> / {{ sTotal }}</template></span>
      </div>
      <ProgressBar :value="sTotal ? (sLeft / sTotal) * 100 : (sLeft ? 100 : 0)" :tone="sessionTone(sLeft, sTotal)" />
    </div>
  </section>
</template>
