<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Modal, Button } from '@gym/shared-ui';
import { calculateExpirationDate, type ApplyPaymentInput } from '@gym/supabase';
import type { Member, Payment, Plan } from '@gym/supabase';

const admin = useAdminStore();

// Props/state for the modal (open with optional member or payment to edit).
const open = ref(false);
const editingId = ref<string | null>(null);
const member = ref<Member | null>(null);
const memberQuery = ref('');
const memberResults = computed(() => {
  const q = memberQuery.value.trim().toLowerCase();
  if (!q) return [];
  return admin.members.filter(m =>
    m.id.toLowerCase().includes(q) ||
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
  ).slice(0, 8);
});

const planId = ref('');
const qty = ref(1);
const payDate = ref(todayIso());
const startDate = ref(todayIso());
const expDate = ref('');
const amount = ref<number | null>(null);
const note = ref('');
const sessions = ref('');

let startOverridden = false;
let expOverridden = false;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openNew(m?: Member | null) {
  member.value = m ?? null;
  memberQuery.value = m ? `${m.firstName} ${m.lastName} (${m.id})` : '';
  editingId.value = null;
  planId.value = '';
  qty.value = 1;
  payDate.value = todayIso();
  startDate.value = todayIso();
  expDate.value = '';
  amount.value = null;
  note.value = '';
  sessions.value = '';
  startOverridden = false;
  expOverridden = false;
  open.value = true;
}

function openEdit(p: Payment) {
  member.value = admin.members.find(m => m.id === p.memberId) ?? null;
  memberQuery.value = member.value ? `${member.value.firstName} ${member.value.lastName} (${member.value.id})` : '';
  editingId.value = p.id;
  planId.value = p.planId ?? '';
  qty.value = 1;
  payDate.value = p.date;
  startDate.value = p.appliedStartDate || p.date;
  expDate.value = p.appliedExpiration ?? '';
  amount.value = p.amount;
  note.value = p.note ?? '';
  sessions.value = p.sessionsGranted != null && p.sessionsGranted > 0 ? String(p.sessionsGranted) : '';
  startOverridden = !!p.appliedStartDate;
  expOverridden = !!p.appliedExpiration;
  // Restore qty from the granted sessions so editing doesn't halve a bundle.
  if (p.sessionsGranted && p.sessionsGranted > 0) {
    const plan = admin.plans.find(pl => pl.id === p.planId);
    const planSessions = plan && plan.sessions ? parseInt(String(plan.sessions), 10) : 0;
    if (planSessions > 0) qty.value = Math.max(1, Math.round(p.sessionsGranted / planSessions));
  }
  open.value = true;
}

const selectedPlan = computed<Plan | null>(() => admin.plans.find(p => p.id === planId.value) ?? null);

function onPlanChange() {
  const plan = selectedPlan.value;
  expOverridden = false;
  startOverridden = false;
  if (plan) {
    amount.value = plan.price * qty.value;
    if (plan.sessions && plan.sessions > 0) {
      sessions.value = String(plan.sessions * qty.value);
    } else if (plan.days && plan.days > 0) {
      computeDates();
    }
  }
}

function onQtyChange() {
  const plan = selectedPlan.value;
  if (!plan) return;
  amount.value = plan.price * qty.value;
  if (plan.sessions && plan.sessions > 0) sessions.value = String(plan.sessions * qty.value);
  else if (plan.days && plan.days > 0) computeDates();
}

function onStartChange() {
  startOverridden = true;
  expOverridden = false;
  computeDates();
}

function onExpChange() {
  expOverridden = true;
}

function computeDates() {
  const plan = selectedPlan.value;
  if (!plan || !plan.days) return;
  let start = startDate.value;
  // Stack onto an unexpired membership unless the admin overrode the start.
  if (!startOverridden && member.value?.expirationDate) {
    const cur = new Date(member.value.expirationDate + 'T23:59:59');
    const chosen = new Date(start + 'T23:59:59');
    if (cur > chosen) start = member.value.expirationDate;
  }
  expDate.value = calculateExpirationDate(start, plan.days * qty.value, []);
}

watch(open, o => { if (!o) member.value = null; });

async function save() {
  if (!member.value) { alert('Select a member.'); return; }
  const payload: ApplyPaymentInput = {
    id: editingId.value ?? undefined,
    memberId: member.value.id,
    date: payDate.value,
    amount: amount.value ?? 0,
    note: note.value || null,
    planId: planId.value || null,
    sessionsGranted: sessions.value !== '' ? (parseInt(sessions.value, 10) || 0) : null,
    appliedExpiration: expDate.value || null,
    appliedStartDate: startDate.value || payDate.value,
    prevExpiration: member.value.expirationDate ?? null
  };
  try {
    await admin.savePayment(payload);
    open.value = false;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Payment failed to save.');
  }
}

async function remove() {
  if (!editingId.value || !member.value) return;
  if (!confirm('Permanently delete this payment record?')) return;
  try {
    await admin.deletePayment(member.value.id, editingId.value);
    open.value = false;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Payment failed to delete.');
  }
}

defineExpose({ openNew, openEdit });
</script>

<template>
  <Modal :open="open" @close="open = false">
    <h2 class="mb-3 text-xl font-bold">{{ editingId ? 'Edit Payment' : 'Add Payment' }}</h2>

    <label class="text-sm font-semibold text-slate-500">Member</label>
    <div class="relative mt-1">
      <input v-model="memberQuery" placeholder="Type to search by name or ID…" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      <div v-if="memberResults.length" class="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow">
        <button v-for="m in memberResults" :key="m.id" class="block w-full px-3 py-2 text-left hover:bg-slate-50" @click="member = m; memberQuery = `${m.firstName} ${m.lastName} (${m.id})`">
          <span class="font-medium">{{ m.firstName }} {{ m.lastName }}</span>
          <span class="ml-2 text-xs text-slate-400">{{ m.id }}</span>
        </button>
      </div>
    </div>

    <div class="mt-3">
      <label class="text-sm font-semibold text-slate-500">Plan (optional)</label>
      <div class="mt-1 flex gap-2">
        <select v-model="planId" class="flex-1 rounded-lg border border-slate-300 px-3 py-2" @change="onPlanChange">
          <option value="">-- Custom Payment / No Plan --</option>
          <option v-for="p in admin.plans" :key="p.id" :value="p.id">{{ p.name }} — €{{ p.price }}</option>
        </select>
        <div class="flex items-center gap-1">
          <label class="text-sm text-slate-500">Qty</label>
          <input v-model.number="qty" type="number" min="1" step="1" class="w-16 rounded-lg border border-slate-300 px-2 py-2" @change="onQtyChange" />
        </div>
        <div class="flex items-center gap-1">
          <label class="text-sm text-slate-500">Sess</label>
          <input v-model="sessions" type="number" min="0" placeholder="auto" class="w-16 rounded-lg border border-slate-300 px-2 py-2" />
        </div>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-semibold text-slate-500">Date</label>
        <input v-model="payDate" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Amount</label>
        <input v-model.number="amount" type="number" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Start</label>
        <input v-model="startDate" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" @change="onStartChange" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Expires</label>
        <input v-model="expDate" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" @change="onExpChange" />
      </div>
    </div>

    <label class="mt-3 block text-sm font-semibold text-slate-500">Note</label>
    <input v-model="note" placeholder="E.g., 6 Months Plan Cash" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />

    <div class="mt-4 flex gap-2">
      <Button v-if="editingId" variant="danger" class="flex-1" @click="remove">Delete</Button>
      <Button variant="outline" class="flex-1" @click="open = false">Cancel</Button>
      <Button class="flex-1" @click="save">Save Payment</Button>
    </div>
  </Modal>
</template>
