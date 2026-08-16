<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  block?: boolean;
  type?: 'button' | 'submit';
}>(), {
  variant: 'primary',
  size: 'md',
  block: false,
  type: 'button'
});
</script>

<template>
  <button
    :type="type"
    :class="[
      'btn',
      `btn-${variant}`,
      size !== 'md' ? `btn-${size}` : '',
      block ? 'w-full' : ''
    ]"
  >
    <slot />
  </button>
</template>
