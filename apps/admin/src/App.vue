<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from './stores/admin';
import { Button } from '@gym/shared-ui';
import CheckinView from './views/CheckinView.vue';
import PaymentsView from './views/PaymentsView.vue';
import DirectoryView from './views/DirectoryView.vue';
import PlansView from './views/PlansView.vue';
import ClosedDatesView from './views/ClosedDatesView.vue';
import SchedulesView from './views/SchedulesView.vue';
import DashboardView from './views/DashboardView.vue';
import SettingsView from './views/SettingsView.vue';
import AdminCheckinModal from './components/AdminCheckinModal.vue';
import BroadcastNotice from './components/BroadcastNotice.vue';

const admin = useAdminStore();
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const tab = ref<'dashboard' | 'checkin' | 'payments' | 'members' | 'plans' | 'closed' | 'schedules' | 'settings'>('dashboard');

async function submit() {
  error.value = null;
  try {
    await admin.signIn(email.value, password.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed.';
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-6">
    <form v-if="!admin.authed" class="mx-auto flex min-h-screen max-w-sm items-center" @submit.prevent="submit">
      <div class="w-full rounded-xl bg-white p-6 shadow">
        <h1 class="mb-4 text-xl font-bold">Admin Sign In</h1>
        <div class="flex flex-col gap-3">
          <input v-model="email" type="email" placeholder="Email" class="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input v-model="password" type="password" placeholder="Password" class="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <Button type="submit" :block="true">Sign In</Button>
          <p v-if="error" class="text-center text-sm font-semibold text-rose-600">{{ error }}</p>
        </div>
      </div>
    </form>

    <div v-else class="mx-auto max-w-6xl">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-extrabold">Admin Panel</h1>
        <div class="flex items-center gap-2">
          <div class="flex overflow-hidden rounded-lg border border-slate-300">
            <button :class="tab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'dashboard'">Dashboard</button>
            <button :class="tab === 'checkin' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'checkin'">Check-in</button>
            <button :class="tab === 'payments' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'payments'">Payments</button>
            <button :class="tab === 'members' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'members'">Members</button>
            <button :class="tab === 'plans' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'plans'">Plans</button>
            <button :class="tab === 'closed' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'closed'">Closed Days</button>
            <button :class="tab === 'schedules' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'schedules'">Schedules</button>
            <button :class="tab === 'settings' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'" class="px-4 py-1.5 text-sm font-semibold" @click="tab = 'settings'">Settings</button>
          </div>
          <Button variant="outline" @click="admin.signOut()">Logout</Button>
        </div>
      </div>

      <BroadcastNotice />
      <DashboardView v-if="tab === 'dashboard'" class="mt-4" />
      <CheckinView v-else-if="tab === 'checkin'" class="mt-4" />
      <PaymentsView v-else-if="tab === 'payments'" class="mt-4" />
      <DirectoryView v-else-if="tab === 'members'" class="mt-4" />
      <PlansView v-else-if="tab === 'plans'" class="mt-4" />
      <ClosedDatesView v-else-if="tab === 'closed'" class="mt-4" />
      <SchedulesView v-else-if="tab === 'schedules'" class="mt-4" />
      <SettingsView v-else class="mt-4" />
    </div>

    <AdminCheckinModal />
  </div>
</template>
