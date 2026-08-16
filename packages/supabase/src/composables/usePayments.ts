import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentRow, PlanRow } from '../types';
import { paymentFromRow, type Payment, type Plan } from '../mappers';
import { applyPayment, deletePayment, type ApplyPaymentInput } from '../rpc';
import { isConfigured } from '../client';

const payments = ref<Payment[]>([]);
const plans = ref<Plan[]>([]);

export function usePayments(client: SupabaseClient) {
  async function load() {
    if (!isConfigured()) return;
    try {
      const [{ data: pData, error: pErr }, { data: plData, error: plErr }] = await Promise.all([
        client.from('payments').select('*'),
        client.from('plans').select('*').is('deleted_at', null)
      ]);
      if (pErr || plErr) throw pErr ?? plErr;
      payments.value = (pData as PaymentRow[]).map(paymentFromRow);
      plans.value = (plData as PlanRow[]).map(p => ({
        id: p.id,
        name: p.name,
        days: p.days,
        sessions: p.sessions,
        price: p.price,
        color: p.color,
        isPublic: p.is_public,
        isTrial: p.is_trial
      }));
    } catch (e) {
      console.warn('payments load failed', e);
    }
  }

  async function save(input: ApplyPaymentInput) {
    await applyPayment(client, input);
    await load();
  }

  async function remove(memberId: string, paymentId: string) {
    await deletePayment(client, memberId, paymentId);
    await load();
  }

  return { payments, plans, load, save, remove };
}
