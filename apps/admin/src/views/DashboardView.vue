<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAdminStore } from '../stores/admin';
import { Badge, Button } from '@gym/shared-ui';
import { computeDashboardKpis, dateToLocalIso } from '@gym/supabase';

const admin = useAdminStore();

const kpis = computed(() => computeDashboardKpis(admin.members, admin.visits, new Date()));

// Visit log filters.
const dateFilter = ref('');
const statusFilter = ref<'all' | 'paid' | 'unpaid'>('all');

const logRows = computed(() => {
  let list = [...admin.visits].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  if (dateFilter.value) {
    list = list.filter(v => dateToLocalIso(new Date(v.entryTime)) === dateFilter.value);
  }
  if (statusFilter.value !== 'all') {
    const wantPaid = statusFilter.value === 'paid';
    list = list.filter(v => v.isUnpaid !== wantPaid);
  }
  return list.slice(0, 50);
});

function memberName(id: string) {
  const m = admin.members.find(x => x.id === id);
  return m ? `${m.firstName} ${m.lastName}` : 'Unknown';
}

// Analytical calendar for a month.
const calMonth = ref(currentMonth());
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const calendar = computed(() => {
  const [yearS, monthS] = calMonth.value.split('-');
  const year = Number(yearS);
  const month = Number(monthS);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const cells: { day: number | null; visits: number; unpaid: number }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, visits: 0, unpaid: 0 });
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayVisits = admin.visits.filter(v => v.entryTime && dateToLocalIso(new Date(v.entryTime)) === iso);
    cells.push({ day, visits: dayVisits.length, unpaid: dayVisits.filter(v => v.isUnpaid).length });
  }
  while (cells.length < 42) cells.push({ day: null, visits: 0, unpaid: 0 });
  return { cells, daysInMonth };
});
function cellBg(c: { visits: number; unpaid: number }) {
  if (c.unpaid > 0) return '#fee2e2';
  if (c.visits > 30) return '#86efac';
  if (c.visits > 15) return '#bbf7d0';
  if (c.visits > 0) return '#dcfce7';
  return '#fff';
}
function shiftMonth(delta: number) {
  const [yS, mS] = calMonth.value.split('-');
  const y = Number(yS), m = Number(mS);
  const d = new Date(y, m - 1 + delta, 1);
  calMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function gotoToday() { calMonth.value = currentMonth(); }
function clickDay(day: number) {
  const [yS, mS] = calMonth.value.split('-');
  const y = Number(yS), m = Number(mS);
  dateFilter.value = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
</script>

<template>
  <div>
    <div class="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-3 shadow">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Currently Inside</div>
        <div class="mt-1 text-2xl font-extrabold">{{ kpis.currentlyInside }}</div>
      </div>
      <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-3 shadow">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Visits Today</div>
        <div class="mt-1 text-2xl font-extrabold">{{ kpis.todayVisits }}</div>
      </div>
      <div class="rounded-xl border-l-4 bg-white p-3 shadow" :class="kpis.unpaidCheckins > 0 ? 'border-rose-500' : 'border-emerald-500'">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Unpaid</div>
        <div class="mt-1 text-2xl font-extrabold" :style="kpis.unpaidCheckins > 0 ? { color: 'var(--danger)' } : {}">{{ kpis.unpaidCheckins }}</div>
      </div>
      <div class="rounded-xl border-l-4 border-emerald-500 bg-white p-3 shadow">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Subscriptions</div>
        <div class="mt-1 text-2xl font-extrabold">{{ kpis.activeSubscriptions }}</div>
      </div>
      <div class="rounded-xl border-l-4 border-sky-500 bg-white p-3 shadow">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Members</div>
        <div class="mt-1 text-2xl font-extrabold">{{ kpis.totalMembers }}</div>
      </div>
      <div class="rounded-xl border-l-4 border-amber-500 bg-white p-3 shadow">
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Genders</div>
        <div class="mt-1 text-sm"><span v-for="(v, k) in kpis.genders" :key="k" class="mr-2">{{ k }}: <strong>{{ v }}</strong></span></div>
      </div>
    </div>

    <div class="mt-4 rounded-xl bg-white p-6 shadow">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-bold">Analytical Calendar</h2>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="shiftMonth(-1)">‹</Button>
          <span class="text-sm font-semibold">{{ calMonth }}</span>
          <Button variant="outline" size="sm" @click="shiftMonth(1)">›</Button>
          <Button v-if="calMonth !== currentMonth()" variant="outline" size="sm" @click="gotoToday">Today</Button>
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center">
        <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="rounded bg-slate-100 py-1 text-xs font-bold text-slate-500">{{ d }}</div>
        <button v-for="(c, i) in calendar.cells" :key="i" :disabled="c.day == null" class="rounded py-2 text-sm transition hover:ring-2 hover:ring-emerald-300" :style="{ background: c.day != null ? cellBg(c) : 'transparent' }" @click="c.day != null && clickDay(c.day)">
          <template v-if="c.day != null">
            <div class="font-bold">{{ c.day }}</div>
            <div v-if="c.visits" class="text-xs text-slate-600">{{ c.visits }}<template v-if="c.unpaid"> · <span class="font-semibold text-rose-600">{{ c.unpaid }}u</span></template></div>
          </template>
        </button>
      </div>
    </div>

    <div class="mt-4 rounded-xl bg-white p-6 shadow">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-bold">Visit Log</h2>
        <div class="flex gap-2">
          <input v-model="dateFilter" type="date" class="rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          <select v-model="statusFilter" class="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b text-left text-slate-400"><th class="pb-2">Date</th><th class="pb-2">Member</th><th class="pb-2">Entry</th><th class="pb-2">Status</th></tr></thead>
          <tbody>
            <tr v-for="v in logRows" :key="v.id" class="border-b">
              <td class="py-2">{{ v.entryTime ? new Date(v.entryTime).toLocaleDateString() : '' }}</td>
              <td class="py-2 font-medium">{{ memberName(v.memberId) }}</td>
              <td class="py-2 text-slate-500">{{ v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }}</td>
              <td class="py-2"><Badge :kind="v.isUnpaid ? 'danger' : 'success'">{{ v.isUnpaid ? 'Unpaid' : 'Paid' }}</Badge></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!logRows.length" class="py-4 text-center text-sm text-slate-400">No visits match.</p>
      </div>
    </div>
  </div>
</template>
