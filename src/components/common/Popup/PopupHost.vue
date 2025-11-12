<script setup lang="ts">
import { watchEffect, onUnmounted } from 'vue';
import { usePopup } from './usePopup';
import BasePopup from './BasePopup.vue';

const { state } = usePopup();

function lockScroll(lock: boolean) {
  const html = document.documentElement;
  if (lock) {
    const gap = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (gap) html.style.paddingRight = `${gap}px`;
  } else {
    html.style.overflow = '';
    html.style.paddingRight = '';
  }
}

watchEffect(() => {
  lockScroll(state.stack.length > 0);
});
onUnmounted(() => lockScroll(false));
</script>

<template>
  <teleport to="body">
    <div v-if="state.stack.length" class="popup-host">
      <BasePopup
        v-for="inst in state.stack"
        :key="inst.id"
        :id="inst.id"
        :component="inst.component"
        :props="inst.props"
        :options="inst.options"
      />
    </div>
  </teleport>
</template>

<style scoped>
.popup-host { position: fixed; inset: 0; z-index: 1000; }
</style>