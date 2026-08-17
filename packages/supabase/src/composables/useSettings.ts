import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isConfigured } from '../client';

export interface AppSettings {
  portalName: string;
  currency: string;
  checkinNotice: string;
  checkinNoticeColor: string;
  attendanceColors: Record<number, string>;
}

const settings = ref<AppSettings>({
  portalName: '🥋 SSG BJJ',
  currency: '€',
  checkinNotice: '',
  checkinNoticeColor: '#fde68a',
  attendanceColors: { 50: '#10b981', 60: '#22c55e', 70: '#84cc16', 80: '#eab308', 90: '#f59e0b', 95: '#f97316', 98: '#d4af37' }
});

export function useSettings(client: SupabaseClient) {
  async function load() {
    if (!isConfigured()) return;
    try {
      const { data, error } = await client.from('settings').select('key, value');
      if (error) throw error;
      const map = new Map<string, string>();
      (data as { key: string; value: string }[]).forEach(r => map.set(r.key, r.value));
      const get = (k: string, fallback: unknown) => {
        const raw = map.get(k);
        if (raw === undefined) return fallback;
        try { return JSON.parse(raw); } catch { return fallback; }
      };
      settings.value = {
        portalName: get('portal_name', settings.value.portalName),
        currency: get('currency', settings.value.currency),
        checkinNotice: get('checkin_notice', ''),
        checkinNoticeColor: get('checkin_notice_color', '#fde68a'),
        attendanceColors: Object.assign({}, settings.value.attendanceColors, get('attendance_colors', {}))
      };
    } catch (e) {
      console.warn('settings load failed', e);
    }
  }

  const upsert = (key: string, value: unknown) =>
    client.from('settings').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });

  async function saveCheckinNotice(message: string, color: string) {
    settings.value.checkinNotice = message;
    settings.value.checkinNoticeColor = color;
    if (!isConfigured()) return;
    await Promise.all([upsert('checkin_notice', message), upsert('checkin_notice_color', color)]);
  }

  async function savePortalName(name: string) {
    settings.value.portalName = name;
    if (isConfigured()) await upsert('portal_name', name);
  }

  async function saveCurrency(c: string) {
    settings.value.currency = c;
    if (isConfigured()) await upsert('currency', c);
  }

  async function saveAttendanceColors(colors: Record<number, string>) {
    settings.value.attendanceColors = colors;
    if (isConfigured()) await upsert('attendance_colors', colors);
  }

  return { settings, load, saveCheckinNotice, savePortalName, saveCurrency, saveAttendanceColors };
}
