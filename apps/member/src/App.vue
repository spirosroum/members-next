<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useMemberStore } from './stores/session';
import MemberInfoCard from './components/MemberInfoCard.vue';
import TrainingStats from './components/TrainingStats.vue';
import HistoryCard from './components/HistoryCard.vue';
import SettingsCard from './components/SettingsCard.vue';
import LoginCard from './components/LoginCard.vue';

const session = useMemberStore();
const isLoggedIn = computed(() => !!session.current);

onMounted(async () => {
  await session.boot();
});
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-slate-100 p-6">
    <header v-if="isLoggedIn" class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">Welcome, {{ session.current?.firstName }}!</h1>
      <button class="text-sm font-semibold text-rose-600" @click="session.signOut()">Logout</button>
    </header>

    <LoginCard v-if="!isLoggedIn" />
    <template v-else>
      <MemberInfoCard />
      <TrainingStats />
      <HistoryCard />
      <SettingsCard />
    </template>
  </div>
</template>
