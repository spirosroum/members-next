import type { Member } from '@gym/supabase';

export function daysRemaining(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate + 'T23:59:59');
  return Math.floor((exp.getTime() - Date.now()) / 86_400_000);
}

export function sessionTone(left: number, total: number): 'green' | 'amber' | 'red' {
  const pct = total > 0 ? left / total : 0;
  return pct > 0.5 ? 'green' : pct > 0.2 ? 'amber' : 'red';
}

export function memberDisplayName(m: Member | null): string {
  if (!m) return '';
  return `${m.firstName} ${m.lastName}`.trim();
}

// Total sessions the member was granted across their payment ledger.
export function sessionsGrantedTotal(member: Member | null, payments: { sessionsGranted: number | null }[]): number {
  if (!member) return 0;
  return payments
    .filter(p => p.sessionsGranted && p.sessionsGranted > 0)
    .reduce((s, p) => s + (p.sessionsGranted ?? 0), 0);
}
