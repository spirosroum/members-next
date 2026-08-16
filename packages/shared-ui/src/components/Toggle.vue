<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean;
  label?: string;
}>(), { label: '' });
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-2">
    <span class="text-sm font-medium text-gray-700">{{ label }}</span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      :class="modelValue ? 'bg-emerald-500' : 'bg-gray-300'"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="modelValue ? 'translate-x-6' : 'translate-x-1'" />
    </button>
  </label>
</template>
