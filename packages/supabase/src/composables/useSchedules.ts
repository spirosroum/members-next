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

  async function saveClosedDate(c: { date: string; dateEnd?: string; repeat?: boolean; reason?: string }) {
    const { error } = await client.from('closed_dates').upsert({
      id: c.date + (c.dateEnd && c.dateEnd !== c.date ? '-' + c.dateEnd : ''),
      date: c.date,
      date_end: c.dateEnd || null,
      repeat: !!c.repeat,
      reason: c.reason || null
    }, { onConflict: 'id' });
    if (error) throw error;
    await load();
  }

  async function deleteClosedDate(id: string) {
    const { error } = await client.from('closed_dates').delete().eq('id', id);
    if (error) throw error;
    await load();
  }

  // Upsert a schedule and replace its slots (delete old, insert new).
  async function saveSchedule(s: {
    id: string;
    name: string;
    description?: string | null;
    color?: string;
    capacity?: number | null;
    isPublic?: boolean;
    availableFrom?: string | null;
    slots: { day: string; start: string; end: string }[];
  }) {
    const { error } = await client.from('schedules').upsert({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      color: s.color ?? '#2563eb',
      capacity: s.capacity ?? null,
      is_public: s.isPublic !== false,
      available_from: s.availableFrom || null,
      deleted_at: null
    }, { onConflict: 'id' });
    if (error) throw error;
    // Replace slots: delete existing then insert.
    const { error: delErr } = await client.from('schedule_slots').delete().eq('schedule_id', s.id);
    if (delErr) throw delErr;
    if (s.slots.length) {
      const { error: insErr } = await client.from('schedule_slots').insert(
        s.slots.map((sl, i) => ({ id: `${s.id}-slot-${i}`, schedule_id: s.id, day: sl.day, start: sl.start, end: sl.end }))
      );
      if (insErr) throw insErr;
    }
    await load();
  }

  async function deleteSchedule(id: string) {
    const { error } = await client.from('schedules').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await load();
  }

  return { schedules, closedDates, load, saveClosedDate, deleteClosedDate, saveSchedule, deleteSchedule };
}
