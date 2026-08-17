<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Button, Badge } from '@gym/shared-ui';
import type { Payment } from '@gym/supabase';
import PaymentModal from '../components/PaymentModal.vue';

const admin = useAdminStore();
const modal = ref<InstanceType<typeof PaymentModal> | null>(null);

const sortedPayments = () => [...admin.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

function memberName(id: string) {
  const m = admin.members.find(x => x.id === id);
  return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
}

function addPayment() {
  modal.value?.openNew();
}
function editPayment(p: Payment) {
  modal.value?.openEdit(p);
}
</script>

<template>
  <div class="rounded-xl bg-white p-6 shadow">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">Payment Ledger</h2>
      <Button size="sm" @click="addPayment">+ Add Payment</Button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-slate-400">
            <th class="pb-2">Date</th><th class="pb-2">Member</th><th class="pb-2">Amount</th><th class="pb-2">Coverage</th><th class="pb-2">Note</th><th class="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in sortedPayments()" :key="p.id" class="border-b">
            <td class="py-2">{{ p.date }}</td>
            <td class="py-2 font-medium">{{ memberName(p.memberId) }}</td>
            <td class="py-2">€{{ p.amount.toFixed(2) }}</td>
            <td class="py-2 text-slate-500">{{ p.appliedExpiration ? `until ${p.appliedExpiration}` : (p.sessionsGranted && p.sessionsGranted > 0 ? `${p.sessionsGranted} sessions` : '—') }}</td>
            <td class="py-2 text-slate-500">{{ p.note || '' }}</td>
            <td class="py-2"><Button variant="outline" size="sm" @click="editPayment(p)">Edit</Button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!admin.payments.length" class="py-4 text-center text-sm text-slate-400">No payments recorded.</p>
    </div>
  </div>

  <PaymentModal ref="modal" />
</template>
