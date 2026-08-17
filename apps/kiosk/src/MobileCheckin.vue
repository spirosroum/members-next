<script setup lang="ts">
import { ref } from 'vue';
import { useKioskStore } from './stores/kiosk';
import { Modal, Button } from '@gym/shared-ui';

const kiosk = useKioskStore();
const id = ref('');

function press(v: string) {
  if (v === 'clear') id.value = '';
  else if (v === 'back') id.value = id.value.slice(0, -1);
  else if (id.value.length < 8) id.value += v;
}
function submit() {
  const t = id.value.trim();
  if (!t) return;
  id.value = '';
  kiosk.lookup(t);
}
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 bg-slate-100 p-6">
    <div class="text-center">
      <h1 class="text-2xl font-extrabold">Check In</h1>
      <p class="text-sm text-slate-500">Enter your member ID</p>
    </div>

    <input
      :value="id" inputmode="numeric" maxlength="8" placeholder="Member ID"
      class="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.25em]"
      @input="id = ($event.target as HTMLInputElement).value.replace(/\D/g, '')"
      @keyup.enter="submit"
    />

    <div class="grid grid-cols-3 gap-2">
      <template v-for="n in 9" :key="n">
        <button class="rounded-lg bg-white py-3 text-xl font-bold shadow" @click="press(String(n))">{{ n }}</button>
      </template>
      <button class="rounded-lg bg-rose-100 py-3 text-sm font-bold text-rose-600" @click="press('clear')">Clear</button>
      <button class="rounded-lg bg-white py-3 text-xl font-bold shadow" @click="press('0')">0</button>
      <button class="rounded-lg bg-white py-3 text-xl font-bold shadow" @click="press('back')">⌫</button>
    </div>

    <Button size="lg" :block="true" @click="submit">Check In</Button>

    <p v-if="kiosk.memberLookupError" class="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700">{{ kiosk.memberLookupError }}</p>
  </div>

  <!-- Reuse the shared class-selection + result modals -->
  <Teleport to="body">
    <Modal :open="kiosk.state === 'selecting-classes' || kiosk.state === 'checking'" @close="kiosk.cancel()">
      <h2 class="mb-1 text-xl font-bold">Select Classes</h2>
      <p v-if="kiosk.pendingMember" class="mb-3 text-sm text-slate-500">
        {{ kiosk.pendingMember.firstName }} {{ kiosk.pendingMember.lastName }}
        <span v-if="kiosk.isUnpaidVisit" class="ml-1 font-semibold text-rose-600">· Needs Renew</span>
      </p>
      <div v-if="kiosk.todayClasses.length" class="max-h-64 space-y-2 overflow-y-auto">
        <button v-for="c in kiosk.todayClasses" :key="c.slotId" type="button"
          class="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left"
          :class="kiosk.selectedClassIds.has(c.slotId) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'"
          @click="kiosk.toggleClass(c.slotId)">
          <span class="font-semibold" :style="{ borderLeft: `4px solid ${c.color}`, paddingLeft: '0.5rem' }">{{ c.name }}</span>
          <span class="text-sm text-slate-500">{{ c.start.slice(0, 5) }} – {{ c.end.slice(0, 5) }}</span>
        </button>
      </div>
      <p v-else class="py-3 text-center text-sm text-slate-400">No classes today. You can still check in.</p>
      <div class="mt-4 flex gap-2">
        <Button variant="outline" class="flex-1" @click="kiosk.cancel()">Cancel</Button>
        <Button class="flex-1" :disabled="kiosk.state === 'checking'" @click="kiosk.submitCheckIn(false)">{{ kiosk.state === 'checking' ? 'Checking in…' : 'Confirm' }}</Button>
      </div>
      <Button variant="ghost" class="mt-2 w-full" @click="kiosk.submitCheckIn(true)">Open Gym (No Class)</Button>
    </Modal>

    <Modal :open="kiosk.state === 'done' || kiosk.state === 'error'" @close="kiosk.resetAlerts()">
      <div class="text-center">
        <div class="mb-2 text-5xl">{{ kiosk.state === 'done' ? '✅' : '⚠️' }}</div>
        <h2 class="mb-1 text-xl font-bold">{{ kiosk.state === 'done' ? "You're checked in!" : 'Check-in issue' }}</h2>
        <p v-if="kiosk.lastAlert" class="mb-3 text-sm text-slate-600">{{ kiosk.lastAlert }}</p>
        <p v-else-if="kiosk.lastError" class="mb-3 text-sm text-rose-600">{{ kiosk.lastError }}</p>
        <Button class="w-full" @click="kiosk.resetAlerts()">Done</Button>
      </div>
    </Modal>
  </Teleport>
</template>
