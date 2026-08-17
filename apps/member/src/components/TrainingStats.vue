<script setup lang="ts">
import { computed } from 'vue';
import { useMemberStore } from '../stores/session';
import { getMemberAttendance, getMemberTrainingCount, attendanceColor } from '@gym/supabase';
import { ProgressBar } from '@gym/shared-ui';

const session = useMemberStore();
const member = computed(() => session.current);

const until = new Date();
until.setHours(23, 59, 59, 999);
const since = new Date(until.getTime() - 89 * 24 * 3600 * 1000);
since.setHours(0, 0, 0, 0);

const attendance = computed(() => {
  const m = member.value;
  if (!m) return null;
  try {
    return getMemberAttendance(m.id, since, until, session.schedules, session.checkins, session.closedDates, {
      onlyPublicOrAttended: true,
      lookbackDays: 90
    });
  } catch { return null; }
});

const total = computed(() => member.value ? getMemberTrainingCount(member.value.id, session.checkins, session.visits.map(v => v.entryTime)) : 0);
const myVisits = computed(() => session.visits.filter(v => v.memberId === member.value?.id));
const totalHours = computed(() =>
  myVisits.value.reduce((s, v) => {
    if (!v.exitTime) return s;
    return s + Math.max(0, (new Date(v.exitTime).getTime() - new Date(v.entryTime).getTime()) / 3_600_000);
  }, 0)
);

const bestClass = computed(() => attendance.value?.perClass.find(c => c.pct != null && c.pct >= 50) ?? null);
const overallColor = computed(() => attendanceColor(attendance.value?.pct ?? null, { 50: '#10b981', 60: '#22c55e', 70: '#84cc16', 80: '#eab308', 90: '#f59e0b', 95: '#f97316', 98: '#d4af37' }));
</script>

<template>
  <section class="rounded-xl bg-white p-6 shadow">
    <h2 class="mb-3 text-lg font-bold">Training Stats</h2>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Trainings</div>
        <div class="mt-1 text-2xl font-extrabold">{{ total }}</div>
      </div>
      <div class="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Hours Trained</div>
        <div class="mt-1 text-2xl font-extrabold">{{ totalHours.toFixed(1) }}h</div>
      </div>
      <div class="rounded-lg border-l-4 border-emerald-500 bg-white p-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</div>
        <div class="mt-1 text-2xl font-extrabold" :style="overallColor ? { color: overallColor } : {}">{{ attendance?.pct ?? '—' }}%</div>
      </div>
    </div>

    <template v-if="attendance && attendance.perClass.length">
      <h3 class="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Attendance (last 90 days)</h3>
      <div v-if="bestClass" class="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <strong>Best Class:</strong> {{ bestClass.name }} <span class="font-bold" :style="{ color: attendanceColor(bestClass.pct, { 50:'#10b981',60:'#22c55e',70:'#84cc16',80:'#eab308',90:'#f59e0b',95:'#f97316',98:'#d4af37' }) ?? 'inherit' }">{{ bestClass.pct }}%</span>
      </div>
      <div v-for="c in attendance.perClass" :key="c.classId" class="mb-2 flex items-center gap-3">
        <span class="w-1/3 text-sm font-medium">{{ c.name }}</span>
        <ProgressBar class="flex-1" :value="c.pct ?? 0" />
        <span class="w-12 text-right text-sm font-bold">{{ c.pct == null ? '—' : c.pct + '%' }}</span>
      </div>
    </template>
    <p v-else class="mt-3 text-sm text-slate-400">No class sessions in this period.</p>
  </section>
</template>
