<script setup lang="ts">
import { watchEffect, onUnmounted } from 'vue';
import { useModal } from './useModal';
import BaseModal from './BaseModal.vue';

const { state } = useModal();

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

// следим за длиной стека
watchEffect(() => {
  lockScroll(state.stack.length > 0);
});
onUnmounted(() => lockScroll(false));
</script>

<template>
  <teleport to="body">
    <div v-if="state.stack.length" class="modal-host">
      <BaseModal
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
.modal-host { position: fixed; inset: 0; z-index: 1000; }
</style>