<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{ open: boolean }>(), { open: false });
const emit = defineEmits<{ close: [] }>();
const show = ref(props.open);

watch(() => props.open, v => { show.value = v; });
watch(show, v => {
  document.body.style.overflow = v ? 'hidden' : '';
  if (!v) emit('close');
});
onBeforeUnmount(() => { document.body.style.overflow = ''; });

function onOverlay() { show.value = false; }
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="onOverlay">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
