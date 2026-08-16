import { ref } from 'vue';
import type { Member, Visit } from '@gym/supabase';
import { useVisits, usePayments, kioskClient } from '@gym/supabase';

// Aggregates the member's dashboard data: visits, unpaid count, payments,
// session bundle total. Keep pure helpers (see utils.ts) unit-testable.
export function useMemberInfo() {
  const info = ref<{
    visits: Visit[];
    sessionsGrantedTotal: number;
  } | null>(null);

  const { visits, refresh: refreshVisits } = useVisits(kioskClient());
  const { payments, load: loadPayments } = usePayments(kioskClient());

  async function loadInfo(memberId: string) {
    await Promise.all([refreshVisits(), loadPayments()]);
    info.value = {
      visits: visits.value,
      sessionsGrantedTotal: payments.value
        .filter(p => p.memberId === memberId && p.sessionsGranted && p.sessionsGranted > 0)
        .reduce((s, p) => s + (p.sessionsGranted ?? 0), 0)
    };
  }

  return { info, loadInfo };
}

export function daysRemaining(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate + 'T23:59:59');
  return Math.floor((exp.getTime() - Date.now()) / 86_400_000);
}

export function sessionTone(left: number, total: number): 'green' | 'amber' | 'red' {
  const pct = total > 0 ? left / total : 0;
  return pct > 0.5 ? 'green' : pct > 0.2 ? 'amber' : 'red';
}

export function memberDisplayName(m: Member): string {
  return `${m.firstName} ${m.lastName}`.trim();
}
