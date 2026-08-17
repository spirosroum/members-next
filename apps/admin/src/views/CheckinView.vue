<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Badge, Button } from '@gym/shared-ui';
import type { Member } from '@gym/supabase';

const admin = useAdminStore();
const query = ref('');
const selected = ref<Member | null>(null);
const searchError = ref<string | null>(null);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return admin.members.filter(m =>
    m.id.toLowerCase().includes(q) ||
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
    (m.phone && m.phone.includes(q))
  ).slice(0, 8);
});

const result = computed(() => selected.value);
const isInside = computed(() =>
  admin.openVisits.some(v => v.memberId === selected.value?.id)
);
const activeVisit = computed(() =>
  admin.openVisits.find(v => v.memberId === selected.value?.id) ?? null
);

const statusKind: Record<string, 'danger' | 'warning' | 'success'> = {
  frozen: 'danger', cancelled: 'danger', inactive: 'warning', expired: 'danger', 'no-sessions': 'warning', active: 'success'
};

function pick(m: Member) {
  selected.value = m;
  searchError.value = null;
  query.value = '';
}

function forceCheckin() {
  if (!selected.value) return;
  admin.startCheckin(selected.value, false);
}

function backdateCheckin() {
  if (!selected.value) return;
  admin.startCheckin(selected.value, true);
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-4 text-2xl font-extrabold">Staff Check-in</h1>

    <div class="rounded-xl bg-white p-6 shadow">
      <input
        v-model="query"
        placeholder="Search by name, ID, or phone…"
        class="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div v-if="results.length" class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
        <button v-for="m in results" :key="m.id" class="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50" @click="pick(m)">
          <span class="font-medium">{{ m.firstName }} {{ m.lastName }}</span>
          <span class="text-sm text-slate-400">{{ m.id }}<template v-if="m.belt"> · {{ m.belt }}</template></span>
        </button>
      </div>
      <p v-if="query && !results.length" class="mt-2 text-sm text-slate-400">No members found.</p>
    </div>

    <div v-if="result" class="mt-4 rounded-xl bg-white p-6 shadow">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">{{ result.firstName }} {{ result.lastName }}</h2>
          <p class="text-sm text-slate-500">ID: {{ result.id }} · {{ result.belt }}</p>
        </div>
        <Badge :kind="statusKind[admin.memberStatus(result)]">{{ admin.memberStatus(result) }}</Badge>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <Button v-if="!isInside" @click="forceCheckin">Check In</Button>
        <Button v-if="!isInside" variant="outline" @click="backdateCheckin">Backdate…</Button>
        <Button v-else variant="danger" @click="admin.checkout(activeVisit!.id)">Checkout Now</Button>
      </div>
    </div>

    <div class="mt-6 rounded-xl bg-white p-6 shadow">
      <h2 class="mb-3 text-lg font-bold">Currently Inside</h2>
      <ul v-if="admin.openVisits.length" class="divide-y divide-slate-100">
        <li v-for="v in admin.openVisits" :key="v.id" class="flex items-center justify-between py-2">
          <span class="font-medium">{{ admin.members.find(m => m.id === v.memberId)?.firstName }} {{ admin.members.find(m => m.id === v.memberId)?.lastName }}</span>
          <div class="flex items-center gap-2">
            <Badge :kind="v.isUnpaid ? 'danger' : 'success'">{{ v.isUnpaid ? 'Needs Renew' : 'OK' }}</Badge>
            <Button variant="outline" size="sm" @click="admin.checkout(v.id)">Checkout</Button>
          </div>
        </li>
      </ul>
      <p v-else class="py-3 text-center text-sm text-slate-400">No members currently inside.</p>
    </div>
  </div>
</template>
