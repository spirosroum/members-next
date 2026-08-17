import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isConfigured } from '../client';

export interface NoticeSettings {
  checkinNotice: string;
  checkinNoticeColor: string;
}

const notice = ref<NoticeSettings>({ checkinNotice: '', checkinNoticeColor: '#fde68a' });

export function useSettings(client: SupabaseClient) {
  async function load() {
    if (!isConfigured()) return;
    try {
      const { data, error } = await client.from('settings').select('key, value');
      if (error) throw error;
      const map = new Map<string, string>();
      (data as { key: string; value: string }[]).forEach(r => map.set(r.key, r.value));
      const raw = map.get('checkin_notice');
      const color = map.get('checkin_notice_color');
      notice.value = {
        checkinNotice: raw ? JSON.parse(raw) : '',
        checkinNoticeColor: color ? JSON.parse(color) : '#fde68a'
      };
    } catch (e) {
      console.warn('settings load failed', e);
    }
  }

  async function saveCheckinNotice(message: string, color: string) {
    notice.value = { checkinNotice: message, checkinNoticeColor: color };
    if (!isConfigured()) return;
    const upsert = (key: string, value: string) =>
      client.from('settings').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
    await Promise.all([
      upsert('checkin_notice', message),
      upsert('checkin_notice_color', color)
    ]);
  }

  return { notice, load, saveCheckinNotice };
}
