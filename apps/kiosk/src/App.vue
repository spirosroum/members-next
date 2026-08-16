<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useKioskStore } from './stores/kiosk';
import MemberIdInput from './components/MemberIdInput.vue';
import PresentList from './components/PresentList.vue';
import ScheduleCard from './components/ScheduleCard.vue';
import Leaderboard from './components/Leaderboard.vue';
import CheckinModal from './components/CheckinModal.vue';
import { Modal, Button } from '@gym/shared-ui';

const kiosk = useKioskStore();

onMounted(() => kiosk.boot());

watch(() => kiosk.state, s => {
  // Auto-dismiss the done/error banner after a few seconds.
  if (s === 'done' || s === 'error') {
    setTimeout(() => kiosk.resetAlerts(), 5000);
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col gap-6 bg-slate-100 p-6">
    <header class="text-center">
      <h1 class="text-3xl font-extrabold text-slate-900">🥋 Sloth Submission Grappling</h1>
      <p class="text-slate-500">Scan your ID or type it below to check in</p>
    </header>

    <MemberIdInput class="mx-auto w-full max-w-md" />

    <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <PresentList />
      <ScheduleCard />
      <Leaderboard />
    </section>

    <CheckinModal />

    <Modal :open="kiosk.state === 'done' || kiosk.state === 'error'" @close="kiosk.resetAlerts()">
      <div class="text-center">
        <div class="mb-2 text-5xl">{{ kiosk.state === 'done' ? '✅' : '⚠️' }}</div>
        <h2 class="mb-1 text-xl font-bold">{{ kiosk.state === 'done' ? "You're checked in!" : 'Check-in issue' }}</h2>
        <p v-if="kiosk.lastAlert" class="mb-3 text-sm text-slate-600">{{ kiosk.lastAlert }}</p>
        <p v-else-if="kiosk.lastError" class="mb-3 text-sm text-rose-600">{{ kiosk.lastError }}</p>
        <Button class="w-full" @click="kiosk.resetAlerts()">Done</Button>
      </div>
    </Modal>
  </div>
</template>
