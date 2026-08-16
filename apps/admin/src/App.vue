<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from './stores/admin';
import { Button } from '@gym/shared-ui';

const admin = useAdminStore();
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);

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
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <form v-if="!admin.authed" class="w-full max-w-sm rounded-xl bg-white p-6 shadow" @submit.prevent="submit">
      <h1 class="mb-4 text-xl font-bold">Admin Sign In</h1>
      <div class="flex flex-col gap-3">
        <input v-model="email" type="email" placeholder="Email" class="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input v-model="password" type="password" placeholder="Password" class="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <Button type="submit" :block="true">Sign In</Button>
        <p v-if="error" class="text-center text-sm font-semibold text-rose-600">{{ error }}</p>
      </div>
    </form>

    <div v-else class="w-full max-w-5xl">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-extrabold">Admin Panel</h1>
        <Button variant="outline" @click="admin.signOut()">Logout</Button>
      </div>
      <div class="rounded-xl bg-white p-6 shadow">
        <h2 class="mb-3 text-lg font-bold">Member Directory</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-slate-400">
              <th class="pb-2">ID</th><th class="pb-2">Name</th><th class="pb-2">Belt</th><th class="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in admin.members" :key="m.id" class="border-b">
              <td class="py-2">{{ m.id }}</td>
              <td class="py-2">{{ m.firstName }} {{ m.lastName }}</td>
              <td class="py-2">{{ m.belt }}</td>
              <td class="py-2">{{ m.accountStatus }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
