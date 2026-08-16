<script setup lang="ts">
import type { Member } from '@gym/supabase';
import { ProgressBar } from '@gym/shared-ui';
import { daysRemaining, sessionTone } from '../composables/memberInfo';

const props = defineProps<{ member: Member; info: { sessionsGrantedTotal: number } | null }>();

const days = daysRemaining(props.member.expirationDate);
const expText = (() => {
  if (!props.member.expirationDate) return props.member.sessionsTotal ? '—' : 'N/A';
  if (days === null) return props.member.expirationDate;
  return `${props.member.expirationDate} (${days} days left)`;
})();

const sLeft = props.member.sessionsLeft;
const sTotal = props.info?.sessionsGrantedTotal ?? 0;
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow">
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
