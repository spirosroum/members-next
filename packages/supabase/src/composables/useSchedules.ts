import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScheduleRow, ScheduleSlotRow, ClosedDateRow } from '../types';
import type { Schedule } from '../mappers';
import { isConfigured } from '../client';

const schedules = ref<Schedule[]>([]);
const closedDates = ref<{ date: string; dateEnd?: string; repeat?: boolean; reason?: string }[]>([]);

export function useSchedules(client: SupabaseClient) {
  async function load() {
    if (!isConfigured()) return;
    try {
      const [{ data: sData, error: sErr }, { data: slotData, error: slotErr }, { data: cData, error: cErr }] =
        await Promise.all([
          client.from('schedules').select('*').is('deleted_at', null),
          client.from('schedule_slots').select('*'),
          client.from('closed_dates').select('*')
        ]);
      if (sErr || slotErr || cErr) throw sErr ?? slotErr ?? cErr;
      const slotsBySchedule = new Map<string, { day: string; start: string; end: string }[]>();
      (slotData as ScheduleSlotRow[]).forEach(s => {
        const list = slotsBySchedule.get(s.schedule_id) || [];
        list.push({ day: s.day, start: s.start, end: s.end });
        slotsBySchedule.set(s.schedule_id, list);
      });
      schedules.value = (sData as ScheduleRow[]).map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        capacity: r.capacity,
        isPublic: r.is_public,
        availableFrom: r.available_from,
        slots: slotsBySchedule.get(r.id) || []
      }));
      closedDates.value = (cData as ClosedDateRow[]).map(r => ({
        date: r.date,
        dateEnd: r.date_end || undefined,
        repeat: r.repeat,
        reason: r.reason || undefined
      }));
    } catch (e) {
      console.warn('schedules load failed', e);
    }
  }

  return { schedules, closedDates, load };
}
