<script setup lang="ts">
withDefaults(defineProps<{
  kind?: 'active' | 'inactive' | 'frozen' | 'cancelled' | 'warning' | 'danger' | 'success';
}>(), { kind: 'success' });
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="{
    'bg-emerald-100 text-emerald-800': kind === 'active' || kind === 'success',
    'bg-gray-200 text-gray-600': kind === 'inactive',
    'bg-sky-100 text-sky-800': kind === 'frozen',
    'bg-rose-100 text-rose-800': kind === 'cancelled' || kind === 'danger',
    'bg-amber-100 text-amber-800': kind === 'warning'
  }">
    <slot />
  </span>
</template>
