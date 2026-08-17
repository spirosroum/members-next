<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button, Modal } from '@gym/shared-ui';

const admin = useAdminStore();

const open = ref(false);
const form = ref({ date: '', dateEnd: '', repeat: false, reason: '' });
const error = ref<string | null>(null);

const list = () => admin.closedDates.sort((a, b) => a.date.localeCompare(b.date));

function openNew() { form.value = { date: '', dateEnd: '', repeat: false, reason: '' }; error.value = null; open.value = true; }

async function save() {
  if (!form.value.date) { error.value = 'Date is required.'; return; }
  error.value = null;
  try {
    await admin.saveClosedDate({
      date: form.value.date,
      dateEnd: form.value.dateEnd || undefined,
      repeat: form.value.repeat,
      reason: form.value.reason || undefined
    });
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed.';
  }
}

async function remove(date: string, dateEnd?: string) {
  const id = date + (dateEnd && dateEnd !== date ? '-' + dateEnd : '');
  if (!confirm(`Delete closed day ${date}?`)) return;
  await admin.deleteClosedDate(id);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">Closed Dates (Holidays)</h2>
      <Button size="sm" @click="openNew">+ Add Closed Day</Button>
    </div>

    <div v-if="list().length" class="divide-y divide-slate-100">
      <div v-for="c in list()" :key="c.date + (c.dateEnd || '')" class="flex items-center justify-between py-2">
        <div>
          <span class="font-medium">{{ c.date }}<template v-if="c.dateEnd && c.dateEnd !== c.date"> – {{ c.dateEnd }}</template></span>
          <span v-if="c.repeat" class="ml-2 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">repeats yearly</span>
          <span v-if="c.reason" class="ml-2 text-sm text-slate-400">{{ c.reason }}</span>
        </div>
        <Button variant="outline" size="sm" @click="remove(c.date, c.dateEnd)">Delete</Button>
      </div>
    </div>
    <p v-else class="py-4 text-center text-sm text-slate-400">No closed dates set.</p>
  </div>

  <Modal :open="open" @close="open = false">
    <h2 class="mb-3 text-xl font-bold">Add Closed Day</h2>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-semibold text-slate-500">From *</label>
        <input v-model="form.date" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label class="text-sm font-semibold text-slate-500">To (optional)</label>
        <input v-model="form.dateEnd" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <div class="col-span-2 flex items-center gap-2 pt-1">
        <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="form.repeat" type="checkbox" class="h-4 w-4" /> Repeats every year</label>
      </div>
      <div class="col-span-2">
        <label class="text-sm font-semibold text-slate-500">Reason (optional)</label>
        <input v-model="form.reason" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </div>
    </div>
    <p v-if="error" class="mt-2 text-sm font-semibold text-rose-600">{{ error }}</p>
    <div class="mt-4 flex gap-2">
      <Button variant="outline" class="flex-1" @click="open = false">Cancel</Button>
      <Button class="flex-1" @click="save">Add</Button>
    </div>
  </Modal>
</template>
