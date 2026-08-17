<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button, Modal } from '@gym/shared-ui';
import type { Plan } from '@gym/supabase';

const admin = useAdminStore();

const open = ref(false);
const editingId = ref<string | null>(null);
const form = ref({ name: '', days: '', sessions: '', price: '', color: '#2563eb', isPublic: true, isTrial: false });
const error = ref<string | null>(null);

function blank() { return { name: '', days: '', sessions: '', price: '', color: '#2563eb', isPublic: true, isTrial: false }; }
function openNew() { editingId.value = null; form.value = blank(); error.value = null; open.value = true; }
function openEdit(p: Plan) {
  editingId.value = p.id;
  form.value = {
    name: p.name, days: p.days != null ? String(p.days) : '', sessions: p.sessions != null ? String(p.sessions) : '',
    price: String(p.price), color: p.color, isPublic: p.isPublic, isTrial: p.isTrial
  };
  error.value = null;
  open.value = true;
}

async function save() {
  if (!form.value.name) { error.value = 'Name is required.'; return; }
  error.value = null;
  try {
    await admin.savePlan({
      id: editingId.value ?? `plan-${Date.now()}`,
      name: form.value.name,
      days: form.value.days !== '' ? (parseInt(form.value.days, 10) || null) : null,
      sessions: form.value.sessions !== '' ? (parseInt(form.value.sessions, 10) || null) : null,
      price: parseFloat(form.value.price) || 0,
      color: form.value.color,
      isPublic: form.value.isPublic,
      isTrial: form.value.isTrial
    });
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed.';
  }
}

async function remove(p: Plan) {
  if (!confirm(`Move "${p.name}" to the plan recycle bin?`)) return;
  await admin.deletePlan(p.id);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">Membership Plans</h2>
      <Button size="sm" @click="openNew">+ New Plan</Button>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="p in admin.plans" :key="p.id" class="rounded-lg border p-4" :style="{ borderLeft: `4px solid ${p.color}` }">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold">{{ p.name }}</div>
            <div class="text-sm text-slate-500">
              €{{ p.price.toFixed(2) }}
              <template v-if="p.days"> · {{ p.days }} days</template>
              <template v-else-if="p.sessions"> · {{ p.sessions }} sessions</template>
            </div>
          </div>
          <div class="flex gap-1">
            <Button variant="outline" size="sm" @click="openEdit(p)">Edit</Button>
            <Button variant="danger" size="sm" @click="remove(p)">Delete</Button>
          </div>
        </div>
        <div class="mt-2 flex gap-2 text-xs">
          <span v-if="p.isTrial" class="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Trial</span>
          <span :class="p.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'" class="rounded px-2 py-0.5 font-semibold">{{ p.isPublic ? 'Public' : 'Hidden' }}</span>
        </div>
      </div>
    </div>
    <p v-if="!admin.plans.length" class="py-4 text-center text-sm text-slate-400">No plans yet.</p>
  </div>

  <Modal :open="open" @close="open = false">
    <h2 class="mb-3 text-xl font-bold">{{ editingId ? 'Edit Plan' : 'New Plan' }}</h2>
    <div class="grid grid-cols-2 gap-2">
      <div class="col-span-2">
        <label class="text-sm font-semibold text-slate-500">Name *</label>
        <input v-model="form.name" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Validity (days)</label>
        <input v-model="form.days" type="number" min="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Sessions</label>
        <input v-model="form.sessions" type="number" min="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Price (€)</label>
        <input v-model="form.price" type="number" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Color</label>
        <input v-model="form.color" type="color" class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300" />
      </div>
      <div class="col-span-2 flex items-center gap-4 pt-1">
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.isPublic" type="checkbox" class="h-4 w-4" /> Public</label>
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.isTrial" type="checkbox" class="h-4 w-4" /> Trial</label>
      </div>
    </div>
    <p v-if="error" class="mt-2 text-sm font-semibold text-rose-600">{{ error }}</p>
    <div class="mt-4 flex gap-2">
      <Button variant="outline" class="flex-1" @click="open = false">Cancel</Button>
      <Button class="flex-1" @click="save">Save Plan</Button>
    </div>
  </Modal>
</template>
