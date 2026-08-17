<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button, Modal } from '@gym/shared-ui';
import type { Schedule } from '@gym/supabase';

const admin = useAdminStore();
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const open = ref(false);
const editingId = ref<string | null>(null);
const form = ref({ name: '', color: '#2563eb', capacity: '', isPublic: true, slots: [] as { day: string; start: string; end: string }[] });
const error = ref<string | null>(null);

function blank() { return { name: '', color: '#2563eb', capacity: '', isPublic: true, slots: [] }; }
function openNew() { editingId.value = null; form.value = blank(); error.value = null; open.value = true; }
function openEdit(s: Schedule) {
  editingId.value = s.id;
  form.value = {
    name: s.name, color: s.color, capacity: s.capacity != null ? String(s.capacity) : '',
    isPublic: s.isPublic, slots: (s.slots || []).map(x => ({ ...x }))
  };
  error.value = null;
  open.value = true;
}

function addSlot() { form.value.slots.push({ day: 'Monday', start: '18:00', end: '19:30' }); }
function removeSlot(i: number) { form.value.slots.splice(i, 1); }

async function save() {
  if (!form.value.name) { error.value = 'Name is required.'; return; }
  error.value = null;
  try {
    await admin.saveSchedule({
      id: editingId.value ?? `sch-${Date.now()}`,
      name: form.value.name,
      color: form.value.color,
      capacity: form.value.capacity !== '' ? (parseInt(form.value.capacity, 10) || null) : null,
      isPublic: form.value.isPublic,
      slots: form.value.slots.filter(s => s.start && s.end)
    });
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed.';
  }
}

async function remove(s: Schedule) {
  if (!confirm(`Move "${s.name}" to the schedule recycle bin?`)) return;
  await admin.deleteSchedule(s.id);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">Class Schedules</h2>
      <Button size="sm" @click="openNew">+ New Schedule</Button>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="s in admin.schedules" :key="s.id" class="rounded-lg border p-4" :style="{ borderLeft: `4px solid ${s.color}` }">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-bold">{{ s.name }}</div>
            <div class="text-sm text-slate-500">{{ s.slots.length }} slot(s)<template v-if="s.capacity"> · cap {{ s.capacity }}</template></div>
          </div>
          <div class="flex gap-1">
            <Button variant="outline" size="sm" @click="openEdit(s)">Edit</Button>
            <Button variant="danger" size="sm" @click="remove(s)">Delete</Button>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <span v-for="(sl, i) in s.slots" :key="i" class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {{ sl.day.slice(0, 3) }} {{ sl.start.slice(0, 5) }}–{{ sl.end.slice(0, 5) }}
          </span>
        </div>
      </div>
    </div>
    <p v-if="!admin.schedules.length" class="py-4 text-center text-sm text-slate-400">No schedules yet.</p>
  </div>

  <Modal :open="open" @close="open = false">
    <h2 class="mb-3 text-xl font-bold">{{ editingId ? 'Edit Schedule' : 'New Schedule' }}</h2>
    <div class="grid grid-cols-3 gap-2">
      <div class="col-span-2">
        <label class="text-sm font-semibold text-slate-500">Name *</label>
        <input v-model="form.name" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Color</label>
        <input v-model="form.color" type="color" class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">Capacity</label>
        <input v-model="form.capacity" type="number" min="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div class="flex items-end pb-1">
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.isPublic" type="checkbox" class="h-4 w-4" /> Public</label>
      </div>
    </div>

    <div class="mt-3">
      <div class="mb-1 flex items-center justify-between">
        <label class="text-sm font-semibold text-slate-500">Weekly Slots</label>
        <Button variant="outline" size="sm" @click="addSlot">+ Slot</Button>
      </div>
      <div v-if="form.slots.length" class="space-y-2">
        <div v-for="(sl, i) in form.slots" :key="i" class="flex items-center gap-2">
          <select v-model="sl.day" class="flex-1 rounded-lg border border-slate-300 px-2 py-2">
            <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
          </select>
          <input v-model="sl.start" type="time" class="rounded-lg border border-slate-300 px-2 py-2" />
          <span class="text-slate-400">–</span>
          <input v-model="sl.end" type="time" class="rounded-lg border border-slate-300 px-2 py-2" />
          <button class="text-rose-500" @click="removeSlot(i)">✕</button>
        </div>
      </div>
      <p v-else class="text-sm text-slate-400">No slots yet — add one above.</p>
    </div>

    <p v-if="error" class="mt-2 text-sm font-semibold text-rose-600">{{ error }}</p>
    <div class="mt-4 flex gap-2">
      <Button variant="outline" class="flex-1" @click="open = false">Cancel</Button>
      <Button class="flex-1" @click="save">Save Schedule</Button>
    </div>
  </Modal>
</template>
