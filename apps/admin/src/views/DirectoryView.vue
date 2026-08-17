<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button, Badge } from '@gym/shared-ui';
import type { Member, BinMember } from '@gym/supabase';
import MemberModal from '../components/MemberModal.vue';

const admin = useAdminStore();
const modal = ref<InstanceType<typeof MemberModal> | null>(null);

const query = ref('');
const statusTab = ref<'all' | 'active' | 'inactive' | 'frozen' | 'cancelled'>('all');
const sortCol = ref<'lastName' | 'id' | 'belt' | 'expirationDate' | 'status'>('lastName');
const sortAsc = ref(true);
const showBin = ref(false);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = admin.members.filter(m => {
    if (statusTab.value !== 'all' && m.accountStatus !== statusTab.value) return false;
    if (!q) return true;
    return m.id.toLowerCase().includes(q)
      || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
      || (m.phone && m.phone.includes(q))
      || (m.email && m.email.toLowerCase().includes(q));
  });
  list = [...list].sort((a, b) => {
    const dir = sortAsc.value ? 1 : -1;
    switch (sortCol.value) {
      case 'id': return a.id.localeCompare(b.id) * dir;
      case 'belt': return a.belt.localeCompare(b.belt) * dir || a.id.localeCompare(b.id) * dir;
      case 'expirationDate': return ((a.expirationDate || '').localeCompare(b.expirationDate || '')) * dir;
      case 'status': return a.accountStatus.localeCompare(b.accountStatus) * dir;
      default: return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`) * dir;
    }
  });
  return list;
});

const binList = computed(() => admin.bin);

async function restore(m: BinMember) {
  await admin.restoreMember(m.id);
  await admin.loadBin();
}

function setSort(col: typeof sortCol.value) {
  if (sortCol.value === col) sortAsc.value = !sortAsc.value;
  else { sortCol.value = col; sortAsc.value = true; }
}

const tabs: { key: typeof statusTab.value; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' }, { key: 'frozen', label: 'Frozen' }, { key: 'cancelled', label: 'Cancelled' }
];

function statusKind(m: Member) {
  return admin.memberStatus(m);
}

function exportCsv() {
  const rows = [['ID', 'First', 'Last', 'Belt', 'Status', 'Expiration', 'Phone', 'Email'].join(',')];
  admin.members.forEach(m => {
    rows.push([m.id, m.firstName, m.lastName, m.belt, m.accountStatus, m.expirationDate || '', m.phone || '', m.email || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'members.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-bold">Member Directory</h2>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="exportCsv">Export CSV</Button>
        <Button variant="outline" size="sm" @click="showBin = !showBin">Bin ({{ binList.length }})</Button>
        <Button size="sm" @click="modal?.openNew()">+ Register</Button>
      </div>
    </div>

    <input v-model="query" placeholder="Search by name, ID, phone, or email…" class="w-full rounded-lg border border-slate-300 px-3 py-2" />

    <div class="mt-3 flex gap-1">
      <button v-for="t in tabs" :key="t.key" :class="statusTab === t.key ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="rounded-lg px-3 py-1.5 text-sm font-semibold" @click="statusTab = t.key">
        {{ t.label }}
      </button>
    </div>

    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-400">
            <th class="cursor-pointer pb-2 select-none" @click="setSort('id')">ID</th>
            <th class="cursor-pointer pb-2 select-none" @click="setSort('lastName')">Name</th>
            <th class="cursor-pointer pb-2 select-none" @click="setSort('belt')">Belt</th>
            <th class="cursor-pointer pb-2 select-none" @click="setSort('status')">Status</th>
            <th class="cursor-pointer pb-2 select-none" @click="setSort('expirationDate')">Expires</th>
            <th class="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id" class="border-b">
            <td class="py-2">{{ m.id }}</td>
            <td class="py-2 font-medium">{{ m.firstName }} {{ m.lastName }}</td>
            <td class="py-2">{{ m.belt }}</td>
            <td class="py-2"><Badge :kind="statusKind(m) === 'active' ? 'success' : (statusKind(m) === 'frozen' || statusKind(m) === 'expired' ? 'danger' : 'warning')">{{ statusKind(m) }}</Badge></td>
            <td class="py-2 text-slate-500">{{ m.expirationDate || (m.sessionsTotal ? `${m.sessionsLeft} sess` : '—') }}</td>
            <td class="py-2"><Button variant="outline" size="sm" @click="modal?.openEdit(m)">Manage</Button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filtered.length" class="py-4 text-center text-sm text-slate-400">No members found.</p>
    </div>

    <div v-if="showBin" class="mt-4 rounded-lg border border-slate-200 p-3">
      <h3 class="mb-2 text-sm font-bold">Recycle Bin</h3>
      <div v-if="binList.length">
        <div v-for="m in binList" :key="m.id" class="flex items-center justify-between border-b py-1.5">
          <span>{{ m.firstName }} {{ m.lastName }} <span class="text-xs text-slate-400">({{ m.id }})</span></span>
          <Button variant="success" size="sm" @click="restore(m)">Restore</Button>
        </div>
      </div>
      <p v-else class="text-sm text-slate-400">Recycle bin empty.</p>
    </div>
  </div>

  <MemberModal ref="modal" />
</template>
