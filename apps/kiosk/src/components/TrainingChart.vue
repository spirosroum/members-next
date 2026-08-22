<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import {
  getCumulativeTrainingSeries,
  computeOvertakeCrowns,
  computeLeaderCrown
} from '@gym/supabase';

const kiosk = useKioskStore();

type Range = '1m' | '3m' | 'all';
const range = ref<Range>('3m');

const isDesktop = ref(typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
let mq: MediaQueryList | null = null;
function onMq(e: MediaQueryListEvent) { isDesktop.value = e.matches; }
const chartWrap = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
let ro: ResizeObserver | null = null;
onMounted(() => {
  mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', onMq);
  if (chartWrap.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(entries => {
      for (const e of entries) containerWidth.value = e.contentRect.width;
    });
    ro.observe(chartWrap.value);
  }
});
onUnmounted(() => {
  mq?.removeEventListener('change', onMq);
  ro?.disconnect();
});

const until = computed(() => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
});
const since = computed(() => {
  if (range.value === 'all') return new Date(0);
  const days = range.value === '1m' ? 29 : 89;
  const d = new Date(until.value.getTime() - days * 86_400_000);
  d.setHours(0, 0, 0, 0);
  return d;
});

const members = computed(() => kiosk.members.filter(m => !m.hideFromLeaderboard));
const memberMap = computed(() => new Map(kiosk.members.map(m => [m.id, m])));
const nameOf = (id: string) => {
  const m = memberMap.value.get(id);
  return m ? `${m.firstName} ${m.lastName}` : id;
};
const finalCountOf = (s: { points: { date: string; count: number }[] }) =>
  s.points[s.points.length - 1]!.count;

const rawSeries = computed(() =>
  getCumulativeTrainingSeries(members.value, kiosk.checkins, kiosk.visits, since.value, until.value)
);

const series = computed(() =>
  [...rawSeries.value].sort((a, b) => {
    const ca = a.points[a.points.length - 1]!.count;
    const cb = b.points[b.points.length - 1]!.count;
    return cb - ca || a.memberId.localeCompare(b.memberId);
  })
);

const crowns = computed(() => computeOvertakeCrowns(series.value));
const leaderCrownId = computed(() => computeLeaderCrown(series.value));

// ---- geometry -------------------------------------------------------------
const PALETTE = [
  '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#22c55e', '#ef4444', '#3b82f6'
];
function color(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

function shortDate(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })}.`;
}

const dates = computed(() => {
  const set = new Set<string>();
  series.value.forEach(s => s.points.forEach(p => set.add(p.date)));
  return [...set].sort();
});

const maxCount = computed(() =>
  Math.max(1, ...series.value.map(s => s.points[s.points.length - 1]!.count))
);

const yTicks = computed(() => {
  const m = maxCount.value;
  let step = 1;
  if (m > 12) step = 2;
  if (m > 24) step = 5;
  if (m > 60) step = 10;
  const ticks: number[] = [];
  for (let v = 0; v <= m; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== m) ticks.push(m);
  return ticks;
});

const marginTop = 28;
const marginBottom = 48;
const marginLeft = 34;
const plotHeight = 240;
const dayWidth = computed(() => {
  const available = containerWidth.value - marginLeft - marginRight.value;
  const n = Math.max(1, dates.value.length);
  return Math.max(18, Math.min(32, available / n));
});
const maxNameLen = computed(() =>
  Math.max(0, ...series.value.map(s => nameOf(s.memberId).length))
);
const marginRight = computed(() => (isDesktop.value ? maxNameLen.value * 6 + 20 : 10));

const plotRight = computed(() => marginLeft + dates.value.length * dayWidth.value);
const width = computed(() => plotRight.value + marginRight.value);
const height = computed(() => marginTop + plotHeight + marginBottom);

// Which x-axis dates get a label (thinned so labels never crowd on mobile).
const xLabels = computed(() => {
  const n = dates.value.length;
  if (!n) return [];
  const target = isDesktop.value ? 14 : 8;
  const step = Math.max(1, Math.ceil(n / target));
  const out: { x: number; text: string }[] = [];
  for (let i = 0; i < n; i += step) {
    out.push({ x: marginLeft + i * dayWidth.value, text: shortDate(dates.value[i]!) });
  }
  const last = n - 1;
  if (last % step !== 0) {
    out.push({ x: marginLeft + last * dayWidth.value, text: shortDate(dates.value[last]!) });
  }
  return out;
});

function xIndex(date: string) {
  return dates.value.indexOf(date);
}
function xPx(date: string) {
  return marginLeft + xIndex(date) * dayWidth.value;
}
function yPx(count: number) {
  return marginTop + plotHeight - (count / maxCount.value) * plotHeight;
}
const plotBottom = marginTop + plotHeight;

// Stagger the end labels of members who finish on the same count so their
// names never stack on top of one another.
const labelOffsets = computed(() => {
  const groups = new Map<number, number[]>();
  series.value.forEach((s, i) => {
    const c = s.points[s.points.length - 1]!.count;
    (groups.get(c) ?? groups.set(c, []).get(c)!).push(i);
  });
  const offsets = new Array<number>(series.value.length).fill(0);
  groups.forEach(indices => {
    const n = indices.length;
    indices.forEach((i, k) => (offsets[i] = (k - (n - 1) / 2) * 12));
  });
  return offsets;
});

function stepPath(points: { date: string; count: number }[]) {
  if (!points.length) return '';
  let d = '';
  points.forEach((p, i) => {
    const xx = xPx(p.date);
    const yy = yPx(p.count);
    if (i === 0) d += `M ${xx} ${yy}`;
    else d += ` H ${xx} V ${yy}`;
  });
  return d + ` H ${plotRight.value}`;
}

const firstTrainings = computed(() => {
  const byDate = new Map<string, { index: number; count: number }[]>();
  series.value.forEach((s, i) => {
    const p = s.points[0]!;
    (byDate.get(p.date) ?? byDate.set(p.date, []).get(p.date)!).push({ index: i, count: p.count });
  });
  const out: { x: number; y: number; color: string }[] = [];
  byDate.forEach((list, date) => {
    const cx = xPx(date);
    const n = list.length;
    list.forEach((item, k) => {
      out.push({
        x: cx + (k - (n - 1) / 2) * 6,
        y: plotBottom + 8,
        color: color(item.index)
      });
    });
  });
  return out;
});

const crownMarkers = computed(() =>
  crowns.value.map(c => ({
    x: xPx(c.date),
    y: yPx(series.value.find(s => s.memberId === c.memberId)?.points.find(p => p.date === c.date)?.count ?? 0) - 14
  }))
);

const finalLabels = computed(() =>
  series.value.map((s, i) => ({
    name: nameOf(s.memberId),
    x: plotRight.value + 8,
    y: yPx(s.points[s.points.length - 1]!.count) + labelOffsets.value[i]!,
    color: color(i),
    isLeader: s.memberId === leaderCrownId.value
  }))
);
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow md:p-6">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold">Training Progress</h2>
        <p class="text-sm text-slate-400">Cumulative trainings per member.</p>
      </div>
      <div class="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          v-for="r in (['1m', '3m', 'all'] as Range[])"
          :key="r"
          class="rounded-md px-2.5 py-1 font-semibold transition"
          :class="range === r ? 'bg-white text-slate-900 shadow' : 'text-slate-500'"
          @click="range = r"
        >{{ r === '1m' ? '1 month' : r === '3m' ? '3 months' : 'All' }}</button>
      </div>
    </div>

    <p v-if="!series.length" class="py-8 text-center text-sm text-slate-400">
      No trainings recorded in this period.
    </p>

    <template v-else>
      <div ref="chartWrap" class="overflow-x-auto">
        <svg :width="width" :height="height" class="block" :viewBox="`0 0 ${width} ${height}`">
          <!-- gridlines + y labels -->
          <g v-for="t in yTicks" :key="'y' + t">
            <line
              :x1="marginLeft" :x2="plotRight" :y1="yPx(t)" :y2="yPx(t)"
              stroke="rgba(0,0,0,0.06)" stroke-width="1"
            />
            <text :x="marginLeft - 6" :y="yPx(t) + 3" text-anchor="end" class="fill-slate-400" font-size="10">{{ t }}</text>
          </g>

          <!-- x-axis + short date labels -->
          <line :x1="marginLeft" :x2="plotRight" :y1="plotBottom" :y2="plotBottom" stroke="#cbd5e1" stroke-width="1" />
          <text
            v-for="l in xLabels"
            :key="l.text"
            :x="l.x"
            :y="plotBottom + 24"
            text-anchor="end"
            class="fill-slate-400"
            font-size="10"
            :transform="`rotate(-40 ${l.x} ${plotBottom + 24})`"
          >{{ l.text }}</text>

          <!-- step lines -->
          <path
            v-for="(s, i) in series"
            :key="s.memberId"
            :d="stepPath(s.points)"
            fill="none"
            :stroke="color(i)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-opacity="0.8"
          />

          <!-- first-training baseline points -->
          <circle
            v-for="(p, i) in firstTrainings"
            :key="'ft' + i"
            :cx="p.x" :cy="p.y" r="4"
            :fill="p.color"
            stroke="#fff" stroke-width="1.5"
          />

          <!-- overtake crowns -->
          <text
            v-for="(c, i) in crownMarkers"
            :key="'crown' + i"
            :x="c.x" :y="c.y"
            text-anchor="middle"
            font-size="16"
          >👑</text>

          <!-- right-side names (desktop) -->
          <g v-if="isDesktop">
            <text
              v-for="(l, i) in finalLabels"
              :key="'label' + i"
              :x="l.x" :y="l.y"
              :fill="l.color"
              font-size="11"
              font-weight="600"
            >{{ l.name }}<tspan v-if="l.isLeader"> 👑</tspan></text>
          </g>
        </svg>
      </div>

      <!-- legend -->
      <ul class="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="(s, i) in series"
          :key="s.memberId"
          class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: color(i) }"></span>
            <span class="truncate font-medium">{{ nameOf(s.memberId) }}</span>
            <span v-if="s.memberId === leaderCrownId" title="Leader">👑</span>
          </span>
          <span class="font-bold text-emerald-600">{{ finalCountOf(s) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
