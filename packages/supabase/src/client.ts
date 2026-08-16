import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// Per-portal keys. The kiosk key should be RLS-restricted to exactly the
// tables/RPCs the kiosk needs (insert check-ins, read public schedules).
// The admin key is only ever used after a real admin auth session.
export const KIOSK_KEY = import.meta.env.VITE_SUPABASE_KIOSK_KEY as string;
export const ADMIN_KEY = import.meta.env.VITE_SUPABASE_ADMIN_KEY as string;

// Local dev without env vars: still render the UI (empty data / login only).
const configured = !!SUPABASE_URL && SUPABASE_URL.startsWith('http');

let adminClient: SupabaseClient | null = null;

// When no backend is configured, all composables short-circuit to empty data
// and realtime is disabled, so the portals render their UI structure locally.
export function isConfigured(): boolean {
  return configured;
}

export function kioskClient(): SupabaseClient {
  if (!configured) {
    return createClient('https://placeholder.supabase.co', 'placeholder') as SupabaseClient;
  }
  return createClient(SUPABASE_URL, KIOSK_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function adminClientInstance(): SupabaseClient {
  if (!configured) return kioskClient();
  if (!adminClient) adminClient = createClient(SUPABASE_URL, ADMIN_KEY);
  return adminClient;
}
