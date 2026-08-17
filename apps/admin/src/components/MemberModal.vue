<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Modal, Button } from '@gym/shared-ui';
import { calculateExpirationDate } from '@gym/supabase';
import type { Member, Plan } from '@gym/supabase';

const admin = useAdminStore();

const open = ref(false);
const editing = ref(false);
const form = ref<Member>(blank());
const originalId = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

function blank(): Member {
  return {
    id: '', firstName: '', lastName: '', gender: null, belt: 'White',
    expirationDate: null, accountStatus: 'inactive', sessionsTotal: false,
    sessionsLeft: 0, planDays: null, hideFromLeaderboard: false,
    phone: '', email: '', dob: '', notes: ''
  };
}

function openNew() {
  originalId.value = '';
  editing.value = false;
  form.value = blank();
  form.value.id = String(1000 + Math.floor(Math.random() * 9000));
  error.value = null;
  open.value = true;
}

function openEdit(m: Member) {
  originalId.value = m.id;
  editing.value = true;
  form.value = { ...m, phone: m.phone ?? '', email: m.email ?? '', dob: m.dob ?? '', notes: m.notes ?? '' };
  error.value = null;
  open.value = true;
}

watch(open, o => { if (!o) { form.value = blank(); } });

const selectedPlan = computed<Plan | null>(() => admin.plans.find(p => p.id === formPlanId.value) ?? null);
const formPlanId = ref('');
const formStartDate = ref(todayIso());
const formSessions = ref('');

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function applyPlan() {
  const plan = selectedPlan.value;
  if (!plan) return;
  if (plan.days && plan.days > 0) {
    form.value.expirationDate = calculateExpirationDate(formStartDate.value, plan.days, admin.closedDates);
    form.value.planDays = plan.days;
  }
  if (plan.sessions && plan.sessions > 0) {
    form.value.sessionsTotal = true;
    form.value.sessionsLeft = plan.sessions;
    form.value.planDays = null;
  }
}

async function save() {
  if (!form.value.id || !form.value.firstName || !form.value.lastName) { error.value = 'ID, first and last name are required.'; return; }
  busy.value = true;
  error.value = null;
  try {
    if (editing.value && originalId.value !== form.value.id) {
      // Server-side rename (cascades to visits/payments/check-ins) first.
      const dup = admin.members.find(m => m.id === form.value.id);
      if (dup) { error.value = 'This ID already belongs to another member.'; return; }
      await admin.renameMember(originalId.value, form.value.id);
    }
    await admin.saveMember(form.value);
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed.';
  } finally {
    busy.value = false;
  }
}

async function remove() {
  if (!confirm('Move this member to the Recycle Bin? (Kept for 1 year)')) return;
  busy.value = true;
  try {
    await admin.softDeleteMember(form.value.id);
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed.';
  } finally {
    busy.value = false;
  }
}

defineExpose({ openNew, openEdit });
</script>

<template>
  <Modal :open="open" @close="open = false">
    <h2 class="mb-3 text-xl font-bold">{{ editing ? 'Edit Member' : 'Register Member' }}</h2>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-semibold text-slate-500">Member ID *</label>
        <input v-model="form.id" maxlength="8" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Status *</label>
        <select v-model="form.accountStatus" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="frozen">Frozen</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">First Name *</label>
        <input v-model="form.firstName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Last Name *</label>
        <input v-model="form.lastName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Belt</label>
        <select v-model="form.belt" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          <option>White</option><option>Blue</option><option>Purple</option><option>Brown</option><option>Black</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Gender</label>
        <select v-model="form.gender" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
          <option :value="null">Unspecified</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Expiration</label>
        <input v-model="form.expirationDate" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Sessions Left</label>
        <input v-model.number="form.sessionsLeft" type="number" min="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Phone</label>
        <input v-model="form.phone" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Email</label>
        <input v-model="form.email" type="email" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Date of Birth</label>
        <input v-model="form.dob" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>
    <label class="mt-2 block text-sm font-semibold text-slate-500">Notes</label>
    <textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"></textarea>

    <div class="mt-3 rounded-lg border border-slate-200 p-3">
      <label class="text-sm font-semibold text-slate-500">Apply Plan (renewal)</label>
      <div class="mt-1 flex gap-2">
        <select v-model="formPlanId" class="flex-1 rounded-lg border border-slate-300 px-3 py-2">
          <option value="">-- No plan --</option>
          <option v-for="p in admin.plans" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <input v-model="formStartDate" type="date" class="rounded-lg border border-slate-300 px-2 py-2" />
        <Button variant="outline" size="sm" @click="applyPlan">Apply</Button>
      </div>
    </div>

    <p v-if="error" class="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{{ error }}</p>

    <div class="mt-4 flex gap-2">
      <Button v-if="editing" variant="danger" class="flex-1" :disabled="busy" @click="remove">Delete</Button>
      <Button variant="outline" class="flex-1" @click="open = false">Cancel</Button>
      <Button class="flex-1" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Save' }}</Button>
    </div>
  </Modal>
</template>
