<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number; // 0..100
  tone?: 'green' | 'amber' | 'red' | 'gray';
  height?: string;
}>(), { tone: 'green', height: '12px' });

const color = computed(() => ({
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  gray: 'bg-gray-400'
}[props.tone]));

const clamped = computed(() => Math.max(0, Math.min(100, props.value)));
</script>

<template>
  <div class="w-full overflow-hidden rounded-full bg-gray-200" :style="{ height }">
    <div class="h-full rounded-full transition-[width] duration-500" :class="color" :style="{ width: clamped + '%' }" />
  </div>
</template>
